/**
 * Chromosome Class for Genetic Algorithm
 * Represents a complete timetable solution
 */

const { calculateFitness, getConstraintReport } = require('./constraints');

class Chromosome {
    constructor(genes = [], fitness = 0) {
        this.genes = genes;
        this.fitness = fitness;
    }

    /**
     * Evaluate fitness of this chromosome
     */
    evaluate(batch, subjects, rooms) {
        this.fitness = calculateFitness(this, batch, subjects, rooms);
        return this.fitness;
    }

    /**
     * Get detailed constraint report
     */
    getReport(batch, subjects, rooms) {
        return getConstraintReport(this, batch, subjects, rooms);
    }

    /**
     * Clone this chromosome
     */
    clone() {
        return new Chromosome(
            this.genes.map(g => ({ ...g })),
            this.fitness
        );
    }

    /**
     * Convert to timetable format (for saving to database)
     */
    toTimetable() {
        return this.genes.map(gene => ({
            day: gene.day,
            startTime: gene.startTime,
            endTime: gene.endTime,
            subject: gene.subjectId,
            faculty: gene.facultyId,
            classroom: gene.roomId,
            type: gene.type,
        }));
    }
}

module.exports = Chromosome;
