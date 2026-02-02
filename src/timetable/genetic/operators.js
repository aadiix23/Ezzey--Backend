/**
 * Genetic Operators: Crossover and Mutation
 * Implements evolution mechanisms for chromosomes
 */

const Chromosome = require('./chromosome');
const { randomChoice, randomInt } = require('./population');
const { getEndTime } = require('./constraints');

const timeSlots = [
    { id: '09:00', start: '09:00', end: '10:00' },
    { id: '10:00', start: '10:00', end: '11:00' },
    { id: '11:00', start: '11:00', end: '12:00' },
    { id: '13:00', start: '13:00', end: '14:00' },
    { id: '14:00', start: '14:00', end: '15:00' },
    { id: '15:00', start: '15:00', end: '16:00' },
    { id: '16:00', start: '16:00', end: '17:00' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Single-point crossover
 * Combines genes from two parents to create offspring
 */
function crossover(parent1, parent2) {
    if (parent1.genes.length === 0 || parent2.genes.length === 0) {
        return [parent1.clone(), parent2.clone()];
    }

    const point = randomInt(1, Math.min(parent1.genes.length, parent2.genes.length) - 1);

    const child1Genes = [
        ...parent1.genes.slice(0, point),
        ...parent2.genes.slice(point)
    ];

    const child2Genes = [
        ...parent2.genes.slice(0, point),
        ...parent1.genes.slice(point)
    ];


    const child1 = new Chromosome(repairChromosome(child1Genes, parent1.genes));
    const child2 = new Chromosome(repairChromosome(child2Genes, parent2.genes));

    return [child1, child2];
}

/**
 * Repair chromosome to ensure all subjects are present
 * If a subject is missing, add it from reference
 * If a subject is duplicated, remove extras
 */
function repairChromosome(genes, referenceGenes) {
    const subjectCounts = {};
    const referenceCounts = {};

    referenceGenes.forEach(gene => {
        const key = gene.subjectId;
        referenceCounts[key] = (referenceCounts[key] || 0) + 1;
    });

    genes.forEach(gene => {
        const key = gene.subjectId;
        subjectCounts[key] = (subjectCounts[key] || 0) + 1;
    });

    const repairedGenes = [...genes];

    Object.keys(subjectCounts).forEach(subjectId => {
        const expected = referenceCounts[subjectId] || 0;
        const actual = subjectCounts[subjectId];

        if (actual > expected) {
            const excess = actual - expected;
            let removed = 0;

            for (let i = repairedGenes.length - 1; i >= 0 && removed < excess; i--) {
                if (repairedGenes[i].subjectId === subjectId) {
                    repairedGenes.splice(i, 1);
                    removed++;
                }
            }
        }
    });

    Object.keys(referenceCounts).forEach(subjectId => {
        const expected = referenceCounts[subjectId];
        const actual = subjectCounts[subjectId] || 0;

        if (actual < expected) {
            const missing = expected - actual;
            const referenceGenesForSubject = referenceGenes.filter(g => g.subjectId === subjectId);

            for (let i = 0; i < missing && i < referenceGenesForSubject.length; i++) {
                repairedGenes.push({ ...referenceGenesForSubject[i] });
            }
        }
    });

    return repairedGenes;
}

/**
 * Mutation: Randomly modify genes
 * Types: change day, change time, change room
 */
function mutate(chromosome, mutationRate = 0.15, rooms = []) {
    const mutated = chromosome.clone();

    for (let i = 0; i < mutated.genes.length; i++) {
        if (Math.random() < mutationRate) {
            const gene = mutated.genes[i];
            const mutationType = randomChoice(['day', 'time', 'room']);

            switch (mutationType) {
                case 'day':
                    gene.day = randomChoice(days);
                    break;

                case 'time':
                    const newTimeSlot = randomChoice(timeSlots);
                    gene.startTime = newTimeSlot.start;
                    gene.endTime = getEndTime(newTimeSlot.start, gene.duration);
                    break;

                case 'room':
                    if (rooms.length > 0) {
                        const isLab = gene.type === 'lab';
                        const roomPool = rooms.filter(r =>
                            isLab ? r.type === 'lab' : ['lecture', 'seminar'].includes(r.type)
                        );

                        if (roomPool.length > 0) {
                            const newRoom = randomChoice(roomPool);
                            gene.roomId = newRoom._id.toString();
                        }
                    }
                    break;
            }
        }
    }

    return mutated;
}

/**
 * Uniform crossover
 * Each gene has 50% chance to come from either parent
 */
function uniformCrossover(parent1, parent2) {
    if (parent1.genes.length !== parent2.genes.length) {
        return crossover(parent1, parent2);
    }

    const child1Genes = [];
    const child2Genes = [];

    for (let i = 0; i < parent1.genes.length; i++) {
        if (Math.random() < 0.5) {
            child1Genes.push({ ...parent1.genes[i] });
            child2Genes.push({ ...parent2.genes[i] });
        } else {
            child1Genes.push({ ...parent2.genes[i] });
            child2Genes.push({ ...parent1.genes[i] });
        }
    }

    return [
        new Chromosome(child1Genes),
        new Chromosome(child2Genes)
    ];
}

/**
 * Swap mutation
 * Swap two random genes
 */
function swapMutation(chromosome) {
    const mutated = chromosome.clone();

    if (mutated.genes.length < 2) return mutated;

    const i = randomInt(0, mutated.genes.length - 1);
    const j = randomInt(0, mutated.genes.length - 1);

    if (i !== j) {
        const temp = mutated.genes[i];
        mutated.genes[i] = mutated.genes[j];
        mutated.genes[j] = temp;
    }

    return mutated;
}

module.exports = {
    crossover,
    uniformCrossover,
    mutate,
    swapMutation,
    repairChromosome,
};
