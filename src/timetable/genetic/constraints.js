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

function getMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function timeRangesOverlap(start1, end1, start2, end2) {
    const s1 = getMinutes(start1);
    const e1 = getMinutes(end1);
    const s2 = getMinutes(start2);
    const e2 = getMinutes(end2);

    return s1 < e2 && s2 < e1;
}

function getEndTime(startTime, duration) {
    const startMinutes = getMinutes(startTime);
    const endMinutes = startMinutes + (duration * 60);
    const hours = Math.floor(endMinutes / 60);
    const minutes = endMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
function countFacultyOverlaps(chromosome) {
    let violations = 0;
    const facultySchedule = {};

    chromosome.genes.forEach(gene => {
        const key = `${gene.facultyId}-${gene.day}`;
        if (!facultySchedule[key]) facultySchedule[key] = [];

        const endTime = getEndTime(gene.startTime, gene.duration);
        facultySchedule[key].push({ start: gene.startTime, end: endTime });
    });

    Object.values(facultySchedule).forEach(slots => {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                if (timeRangesOverlap(slots[i].start, slots[i].end, slots[j].start, slots[j].end)) {
                    violations++;
                }
            }
        }
    });

    return violations;
}
function countRoomOverlaps(chromosome) {
    let violations = 0;
    const roomSchedule = {};

    chromosome.genes.forEach(gene => {
        const key = `${gene.roomId}-${gene.day}`;
        if (!roomSchedule[key]) roomSchedule[key] = [];

        const endTime = getEndTime(gene.startTime, gene.duration);
        roomSchedule[key].push({ start: gene.startTime, end: endTime });
    });

    Object.values(roomSchedule).forEach(slots => {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                if (timeRangesOverlap(slots[i].start, slots[i].end, slots[j].start, slots[j].end)) {
                    violations++;
                }
            }
        }
    });

    return violations;
}

/**
 * HC3: No Student Overlap
 * A batch cannot have two subjects at the same time
 */
function countStudentOverlaps(chromosome) {
    let violations = 0;
    const batchSchedule = {};

    chromosome.genes.forEach(gene => {
        const key = gene.day;
        if (!batchSchedule[key]) batchSchedule[key] = [];

        const endTime = getEndTime(gene.startTime, gene.duration);
        batchSchedule[key].push({ start: gene.startTime, end: endTime });
    });

    Object.values(batchSchedule).forEach(slots => {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                if (timeRangesOverlap(slots[i].start, slots[i].end, slots[j].start, slots[j].end)) {
                    violations++;
                }
            }
        }
    });

    return violations;
}

/**
 * HC4: Room Capacity
 * Room must have sufficient capacity for batch strength
 */
function countCapacityViolations(chromosome, batch, rooms) {
    let violations = 0;

    chromosome.genes.forEach(gene => {
        const room = rooms.find(r => r._id.toString() === gene.roomId);
        if (room && room.capacity < batch.strength) {
            violations++;
        }
    });

    return violations;
}

/**
 * HC5: Room Type Matching
 * Labs need lab rooms, theory needs lecture/seminar rooms
 */
function countRoomTypeMismatches(chromosome, subjects, rooms) {
    let violations = 0;

    chromosome.genes.forEach(gene => {
        const subject = subjects.find(s => s._id.toString() === gene.subjectId);
        const room = rooms.find(r => r._id.toString() === gene.roomId);

        if (subject && room) {
            const isLab = subject.type === 'lab';
            const isLabRoom = room.type === 'lab';
            const isLectureRoom = ['lecture', 'seminar'].includes(room.type);

            if (isLab && !isLabRoom) violations++;
            if (!isLab && !isLectureRoom) violations++;
        }
    });

    return violations;
}

/**
 * HC6: Lunch Break
 * No classes during 12:00-13:00
 */
function countLunchBreakViolations(chromosome) {
    let violations = 0;

    chromosome.genes.forEach(gene => {
        const endTime = getEndTime(gene.startTime, gene.duration);

        if (timeRangesOverlap(gene.startTime, endTime, '12:00', '13:00')) {
            violations++;
        }
    });

    return violations;
}

/**
 * HC7: One Subject Per Day
 * Each subject can appear at most once per day
 */
function countSubjectPerDayViolations(chromosome) {
    let violations = 0;
    const subjectDays = {};

    chromosome.genes.forEach(gene => {
        const key = `${gene.subjectId}-${gene.day}`;
        subjectDays[key] = (subjectDays[key] || 0) + 1;
    });

    Object.values(subjectDays).forEach(count => {
        if (count > 1) violations += (count - 1);
    });

    return violations;
}

/**
 * HC8: Working Hours
 * Classes only between 09:00-17:00
 */
function countWorkingHoursViolations(chromosome) {
    let violations = 0;

    chromosome.genes.forEach(gene => {
        const startMinutes = getMinutes(gene.startTime);
        const endTime = getEndTime(gene.startTime, gene.duration);
        const endMinutes = getMinutes(endTime);

        if (startMinutes < getMinutes('09:00') || endMinutes > getMinutes('17:00')) {
            violations++;
        }
    });

    return violations;
}

/**
 * HC9: Continuous Blocks
 * Multi-hour blocks must be continuous (no gaps)
 * This is ensured by the chromosome structure (duration field)
 */
function countContinuityViolations(chromosome) {
   
   
    return 0;
}

// ============================================================================
// SOFT CONSTRAINTS (Optimize for quality)
// ============================================================================

/**
 * SC1: Minimize Gaps
 * Reduce empty slots in daily schedule
 */
function countGaps(chromosome) {
    let totalGaps = 0;

    days.forEach(day => {
        const dayGenes = chromosome.genes.filter(g => g.day === day);
        if (dayGenes.length === 0) return;

       
        dayGenes.sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

        for (let i = 0; i < dayGenes.length - 1; i++) {
            const currentEnd = getEndTime(dayGenes[i].startTime, dayGenes[i].duration);
            const nextStart = dayGenes[i + 1].startTime;

            const gapMinutes = getMinutes(nextStart) - getMinutes(currentEnd);
            if (gapMinutes > 0 && gapMinutes < 180) {
                totalGaps += gapMinutes / 60;
            }
        }
    });

    return totalGaps;
}

/**
 * SC2: Balance Load
 * Distribute subjects evenly across the week
 */
function calculateLoadImbalance(chromosome) {
    const dailyCounts = {};
    days.forEach(day => dailyCounts[day] = 0);

    chromosome.genes.forEach(gene => {
        dailyCounts[gene.day]++;
    });

    const counts = Object.values(dailyCounts);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;

    return Math.sqrt(variance);
}

/**
 * SC3: Morning Preference for Theory
 * Prefer morning slots for theory, afternoon for labs
 */
function countAfternoonTheory(chromosome, subjects) {
    let count = 0;

    chromosome.genes.forEach(gene => {
        const subject = subjects.find(s => s._id.toString() === gene.subjectId);
        if (subject && subject.type !== 'lab') {
            const startMinutes = getMinutes(gene.startTime);
            if (startMinutes >= getMinutes('13:00')) {
                count++;
            }
        }
    });

    return count;
}

/**
 * SC4: Avoid Consecutive Days
 * Avoid scheduling same subject on consecutive days
 */
function countConsecutiveDays(chromosome) {
    let count = 0;
    const subjectDays = {};

    chromosome.genes.forEach(gene => {
        if (!subjectDays[gene.subjectId]) subjectDays[gene.subjectId] = [];
        subjectDays[gene.subjectId].push(gene.day);
    });

    Object.values(subjectDays).forEach(daysList => {
        const dayIndices = daysList.map(d => days.indexOf(d)).sort((a, b) => a - b);

        for (let i = 0; i < dayIndices.length - 1; i++) {
            if (dayIndices[i + 1] - dayIndices[i] === 1) {
                count++;
            }
        }
    });

    return count;
}

// ============================================================================
// MAIN EVALUATION FUNCTIONS
// ============================================================================

/**
 * HC10: Missing Hours
 * Ensure every subject has exactly the required number of hours scheduled
 */
function countMissingHoursViolations(chromosome, subjects) {
    let violations = 0;
    const subjectHours = {};

    chromosome.genes.forEach(gene => {
        subjectHours[gene.subjectId] = (subjectHours[gene.subjectId] || 0) + gene.duration;
    });

    subjects.forEach(subject => {
        const scheduled = subjectHours[subject._id.toString()] || 0;
        const required = subject.hoursPerWeek || 3;

        if (scheduled !== required) {
           
            violations += Math.abs(required - scheduled);
        }
    });

    return violations;
}

// ============================================================================
// MAIN EVALUATION FUNCTIONS
// ============================================================================

/**
 * Evaluate all hard constraints
 * Returns 1 if all satisfied, 0 otherwise
 */
function evaluateHardConstraints(chromosome, batch, subjects, rooms) {
    const violations =
        countFacultyOverlaps(chromosome) +
        countRoomOverlaps(chromosome) +
        countStudentOverlaps(chromosome) +
        countCapacityViolations(chromosome, batch, rooms) +
        countRoomTypeMismatches(chromosome, subjects, rooms) +
        countLunchBreakViolations(chromosome) +
        countSubjectPerDayViolations(chromosome) +
        countWorkingHoursViolations(chromosome) +
        countContinuityViolations(chromosome) +
        countMissingHoursViolations(chromosome, subjects);

    return violations === 0 ? 1 : 0;
}

/**
 * Evaluate all soft constraints
 * Returns total penalty score
 */
function evaluateSoftConstraints(chromosome, subjects) {
    const penalty =
        countGaps(chromosome) * 10 +
        calculateLoadImbalance(chromosome) * 5 +
        countAfternoonTheory(chromosome, subjects) * 3 +
        countConsecutiveDays(chromosome) * 2;

    return penalty;
}

/**
 * Calculate overall fitness
 * fitness = hardConstraintScore * 1000 - softConstraintPenalties
 */
function calculateFitness(chromosome, batch, subjects, rooms) {
    const hardScore = evaluateHardConstraints(chromosome, batch, subjects, rooms);

   
   
    if (hardScore === 0) {
        const violations =
            countFacultyOverlaps(chromosome) +
            countRoomOverlaps(chromosome) +
            countStudentOverlaps(chromosome) +
            countCapacityViolations(chromosome, batch, rooms) +
            countRoomTypeMismatches(chromosome, subjects, rooms) +
            countLunchBreakViolations(chromosome) +
            countSubjectPerDayViolations(chromosome) +
            countWorkingHoursViolations(chromosome) +
            countContinuityViolations(chromosome) +
            countMissingHoursViolations(chromosome, subjects);

       
       
        return 1000 - (violations * 10) - evaluateSoftConstraints(chromosome, subjects);
    }

    return 1000 - evaluateSoftConstraints(chromosome, subjects);
}

/**
 * Get detailed constraint report
 */
function getConstraintReport(chromosome, batch, subjects, rooms) {
    return {
        hardConstraints: {
            facultyOverlaps: countFacultyOverlaps(chromosome),
            roomOverlaps: countRoomOverlaps(chromosome),
            studentOverlaps: countStudentOverlaps(chromosome),
            capacityViolations: countCapacityViolations(chromosome, batch, rooms),
            roomTypeMismatches: countRoomTypeMismatches(chromosome, subjects, rooms),
            lunchBreakViolations: countLunchBreakViolations(chromosome),
            subjectPerDayViolations: countSubjectPerDayViolations(chromosome),
            workingHoursViolations: countWorkingHoursViolations(chromosome),
            continuityViolations: countContinuityViolations(chromosome),
            missingHoursViolations: countMissingHoursViolations(chromosome, subjects),
        },
        softConstraints: {
            gaps: countGaps(chromosome),
            loadImbalance: calculateLoadImbalance(chromosome),
            afternoonTheory: countAfternoonTheory(chromosome, subjects),
            consecutiveDays: countConsecutiveDays(chromosome),
        },
        fitness: calculateFitness(chromosome, batch, subjects, rooms),
    };
}

module.exports = {
   
    countFacultyOverlaps,
    countRoomOverlaps,
    countStudentOverlaps,
    countCapacityViolations,
    countRoomTypeMismatches,
    countLunchBreakViolations,
    countSubjectPerDayViolations,
    countWorkingHoursViolations,
    countContinuityViolations,
    countMissingHoursViolations,

   
    countGaps,
    calculateLoadImbalance,
    countAfternoonTheory,
    countConsecutiveDays,

   
    evaluateHardConstraints,
    evaluateSoftConstraints,
    calculateFitness,
    getConstraintReport,

   
    getEndTime,
    timeRangesOverlap,
};
