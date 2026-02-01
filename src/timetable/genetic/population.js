/**
 * Population Management for Genetic Algorithm
 * Handles initialization, selection, and evolution
 */

const Chromosome = require('./chromosome');
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
 * Get random element from array
 */
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Helper: Get block durations for a subject
 * Returns array of durations, e.g., 4h -> [2, 2], 3h -> [2, 1]
 */
function getBlockDurations(subject) {
    const isLab = subject.type === 'lab';
    let hoursNeeded = subject.hoursPerWeek || 3;
    const blocks = [];

   
   
    const BLOCK_SIZE = 1;

    while (hoursNeeded > 0) {
        const duration = Math.min(hoursNeeded, BLOCK_SIZE);
        blocks.push(duration);
        hoursNeeded -= duration;
    }

    return blocks;
}

/**
 * Get appropriate room pool for subject type
 */
function getRoomPool(subjectType, rooms) {
    if (subjectType === 'lab') {
        return rooms.filter(r => r.type === 'lab');
    }
    return rooms.filter(r => ['lecture', 'seminar'].includes(r.type));
}

/**
 * Generate a random valid chromosome
 */
function generateRandomChromosome(batch, rooms) {
    const genes = [];
    const usedSlots = new Set();

   
    batch.subjects.forEach(subjectEntry => {
        const subject = subjectEntry.subject;
        const faculty = subjectEntry.faculty;
        const roomPool = getRoomPool(subject.type, rooms);

        const blockDurations = getBlockDurations(subject);

        if (roomPool.length === 0) {
            console.warn(`No rooms available for ${subject.name} (${subject.type})`);
            return;
        }

       
        blockDurations.forEach((duration, i) => {
            let placed = false;
            let attempts = 0;
            const maxAttempts = 50;

            let gene = {
                subjectId: subject._id.toString(),
                duration,
                facultyId: faculty._id.toString(),
                type: subject.type,
            };

           
            while (!placed && attempts < maxAttempts) {
                const day = randomChoice(days);
                const timeSlot = randomChoice(timeSlots);
                const room = randomChoice(roomPool);

               
                let isBlocked = false;
                for (let k = 0; k < duration; k++) {
                    const slotIndex = timeSlots.findIndex(ts => ts.start === timeSlot.start);
                    if (slotIndex === -1 || slotIndex + k >= timeSlots.length) {
                        isBlocked = true;
                        break;
                    }

                    const currentSlot = timeSlots[slotIndex + k];
                   
                    const key = `${day}-${currentSlot.start}-${room._id}`;
                    if (usedSlots.has(key)) {
                        isBlocked = true;
                        break;
                    }
                }

                if (!isBlocked) {
                    gene.day = day;
                    gene.startTime = timeSlot.start;
                    gene.endTime = getEndTime(timeSlot.start, duration);
                    gene.roomId = room._id.toString();

                    const slotIndex = timeSlots.findIndex(ts => ts.start === timeSlot.start);
                    for (let k = 0; k < duration; k++) {
                        const currentSlot = timeSlots[slotIndex + k];
                        const key = `${day}-${currentSlot.start}-${room._id}`;
                        usedSlots.add(key);
                    }

                    placed = true;
                }
                attempts++;
            }

           
            if (!placed) {
                const day = randomChoice(days);
                const timeSlot = randomChoice(timeSlots);
                const room = randomChoice(roomPool);

                gene.day = day;
                gene.startTime = timeSlot.start;
                gene.endTime = getEndTime(timeSlot.start, duration);
                gene.roomId = room._id.toString();
            }

            genes.push(gene);
        });
    });

    return new Chromosome(genes);
}

/**
 * Initialize population with random chromosomes
 */
function initializePopulation(batch, rooms, populationSize = 50) {
    console.log(`🧬 Initializing population of ${populationSize} chromosomes...`);

    const population = [];

    for (let i = 0; i < populationSize; i++) {
        const chromosome = generateRandomChromosome(batch, rooms);
        population.push(chromosome);

        if ((i + 1) % 10 === 0) {
            console.log(`   Generated ${i + 1}/${populationSize} chromosomes`);
        }
    }

    console.log(`✅ Population initialized with ${population.length} chromosomes`);
    return population;
}

/**
 * Tournament selection
 * Select best chromosome from random subset
 */
function tournamentSelection(population, tournamentSize = 3) {
    const tournament = [];

    for (let i = 0; i < tournamentSize; i++) {
        const randomIndex = randomInt(0, population.length - 1);
        tournament.push(population[randomIndex]);
    }

   
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
}

/**
 * Apply elitism - keep top performers
 */
function applyElitism(population, eliteRatio = 0.1) {
    const eliteSize = Math.floor(population.length * eliteRatio);
    return population.slice(0, eliteSize);
}

module.exports = {
    initializePopulation,
    tournamentSelection,
    applyElitism,
    generateRandomChromosome,
    randomChoice,
    randomInt,
};
