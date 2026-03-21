/**
 * Genetic Algorithm Main Engine
 * Orchestrates the evolution process for timetable generation
 */

const Chromosome = require('./chromosome');
const { initializePopulation, tournamentSelection, applyElitism } = require('./population');
const { crossover, mutate } = require('./operators');
const { Worker, isMainThread } = require('worker_threads');
const path = require('path');

const GA_CONFIG = {
    populationSize: 50,
    generations: 100,
    tournamentSize: 3,
    mutationRate: 0.15,
    eliteRatio: 0.1,
    crossoverRate: 0.8,
    targetFitness: 1000,
    stagnationLimit: 20,
};

/**
 * Main genetic algorithm function
 * Evolves population to find optimal timetable
 * NOW PURE FUNCTION (mostly) - DB decoupled
 */
/**
 * Main genetic algorithm function
 * Evolves population to find optimal timetable
 * NOW PURE FUNCTION (mostly) - DB decoupled
 */
async function evolveTimeTable(batch, allRooms, occupiedSlots = [], config = {}) {
    const settings = { ...GA_CONFIG, ...config };

    if (isMainThread) {
        // Just a log to show which thread is running
        // console.log('⚠️ Running GA on Main Thread (Fallback?)');
    } else {
        // console.log('🧵 Running GA on Worker Thread');
    }

    console.log('🧬 Starting Genetic Algorithm for Timetable Generation');
    console.log(`   Population: ${settings.populationSize}`);
    console.log(`   Max Generations: ${settings.generations}`);
    console.log(`   Mutation Rate: ${settings.mutationRate}`);
    console.log(`   Occupied Slots: ${occupiedSlots.length}`);
    console.log('');


    const subjects = batch.subjects.map(s => s.subject);


    let population = initializePopulation(batch, allRooms, settings.populationSize);


    let bestEver = null;
    let bestEverFitness = -Infinity;
    let generationsWithoutImprovement = 0;


    for (let gen = 0; gen < settings.generations; gen++) {

        population.forEach(chromosome => {
            chromosome.evaluate(batch, subjects, allRooms, occupiedSlots);
        });


        population.sort((a, b) => b.fitness - a.fitness);


        const currentBest = population[0];
        if (currentBest.fitness > bestEverFitness) {
            bestEver = currentBest.clone();
            bestEverFitness = currentBest.fitness;
            generationsWithoutImprovement = 0;

            console.log(`🎯 Gen ${gen}: New best fitness = ${bestEverFitness.toFixed(2)}`);


            if (gen % 10 === 0 || bestEverFitness >= settings.targetFitness) {
                const report = currentBest.getReport(batch, subjects, allRooms, occupiedSlots);
                const hardViolations = Object.values(report.hardConstraints).reduce((a, b) => a + b, 0);
                console.log(`   Hard constraint violations: ${hardViolations}`);
                if (hardViolations === 0) {
                    console.log(`   ✅ All hard constraints satisfied!`);
                    console.log(`   Soft constraint penalty: ${Object.values(report.softConstraints).reduce((a, b) => a + b, 0).toFixed(2)}`);
                }
            }
        } else {
            generationsWithoutImprovement++;
        }

        if (currentBest.fitness >= settings.targetFitness) {
            console.log(`\n✅ Perfect solution found in generation ${gen}!`);
            break;
        }

        if (generationsWithoutImprovement >= settings.stagnationLimit) {
            console.log(`\n⚠️  Stopping early: No improvement for ${settings.stagnationLimit} generations`);
            break;
        }


        if (gen % 10 === 0 && gen > 0) {
            console.log(`   Gen ${gen}: Best = ${currentBest.fitness.toFixed(2)}, Avg = ${(population.reduce((sum, c) => sum + c.fitness, 0) / population.length).toFixed(2)}`);
        }

        const newPopulation = [];


        const elite = applyElitism(population, settings.eliteRatio);
        newPopulation.push(...elite.map(c => c.clone()));

        while (newPopulation.length < settings.populationSize) {

            const parent1 = tournamentSelection(population, settings.tournamentSize);
            const parent2 = tournamentSelection(population, settings.tournamentSize);

            let child1, child2;


            if (Math.random() < settings.crossoverRate) {
                [child1, child2] = crossover(parent1, parent2);
            } else {
                child1 = parent1.clone();
                child2 = parent2.clone();
            }


            child1 = mutate(child1, settings.mutationRate, allRooms);
            child2 = mutate(child2, settings.mutationRate, allRooms);

            newPopulation.push(child1);
            if (newPopulation.length < settings.populationSize) {
                newPopulation.push(child2);
            }
        }

        population = newPopulation;
    }


    console.log('\n📊 Evolution Complete!');
    console.log(`   Best fitness achieved: ${bestEverFitness.toFixed(2)}`);

    const finalReport = bestEver.getReport(batch, subjects, allRooms, occupiedSlots);
    console.log('\n📋 Final Constraint Report:');
    console.log('   Hard Constraints:');
    Object.entries(finalReport.hardConstraints).forEach(([name, count]) => {
        const status = count === 0 ? '✅' : '❌';
        console.log(`      ${status} ${name}: ${count} violations`);
    });

    console.log('\n   Soft Constraints:');
    Object.entries(finalReport.softConstraints).forEach(([name, value]) => {
        console.log(`      ${name}: ${value.toFixed(2)}`);
    });

    return bestEver;
}

/**
 * Convert chromosome to timetable format for controller
 */
function chromosomeToTimetable(chromosome) {
    // If coming from worker, chromosome is a plain object, so we access .genes directly.
    return chromosome.genes.map(gene => ({
        day: gene.day,
        startTime: gene.startTime,
        endTime: gene.endTime,
        subject: gene.subjectId,
        faculty: gene.facultyId,
        classroom: gene.roomId,
        type: gene.type,
    }));
}


/**
 * Main entry point for genetic algorithm timetable generation
 * NOW SPAWNS A WORKER
 */
async function generateTimetableGA(batch, config = {}) {
    try {
        console.log('🚀 Spawning Worker Thread for GA...');

        // Ensure occupiedSlots is part of config (if passed separately)
        const occupiedSlots = config.occupiedSlots || [];
        console.log(`   Running with ${occupiedSlots.length} pre-occupied slots.`);


        // Late require of Model to avoid worker trying to load it globally if not needed
        // although require is cached, this makes the dependency clear in the main thread context
        const Classroom = require('../../models/Classroom');

        // Fetch rooms as LEAN objects (pure JSON) for efficient transfer
        const allRoomsRaw = await Classroom.find({ isActive: true }).sort({ capacity: 1 }).lean();
        // Ensure ObjectIds are stringified so they survive transfer to worker without losing .toString() capability
        const allRooms = JSON.parse(JSON.stringify(allRoomsRaw));

        return new Promise((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, 'worker.js'), {
                workerData: {
                    batch: JSON.parse(JSON.stringify(batch)), // Ensure completely serializable
                    allRooms,
                    occupiedSlots, // Pass raw occupied slots
                    config
                }
            });

            worker.on('message', (bestChromosome) => {
                console.log('✅ Worker completed. Processing results...');
                const weekSlots = chromosomeToTimetable(bestChromosome);
                resolve(weekSlots);
            });

            worker.on('error', (err) => {
                console.error('❌ Worker threw error:', err);
                reject(err);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });

    } catch (error) {
        console.error('❌ Error in genetic algorithm launcher:', error);
        throw error;
    }
}

module.exports = {
    generateTimetableGA,
    evolveTimeTable,
    chromosomeToTimetable,
    GA_CONFIG,
};
