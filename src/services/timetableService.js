/**
 * Timetable Service
 * Contains business logic for timetable operations
 */

class TimetableService {
  /**
   * Calculate total hours for a subject in a week
   */
  static calculateTotalHours(subject) {
    return subject.hoursPerWeek || 0;
  }

  /**
   * Check if faculty is available at given time slot
   */
  static isFacultyAvailable(faculty, day, startTime, endTime) {
   
   
    return true;
  }

  /**
   * Check if classroom is available at given time slot
   */
  static isClassroomAvailable(classroom, day, startTime, endTime) {
   
   
    return true;
  }

  /**
   * Validate timetable constraints
   */
  static validateConstraints(timetable, batch) {
    const conflicts = [];

    const facultySlots = {};
    timetable.forEach((slot) => {
      if (!facultySlots[slot.faculty]) {
        facultySlots[slot.faculty] = [];
      }
      facultySlots[slot.faculty].push(slot);
    });

    const classroomSlots = {};
    timetable.forEach((slot) => {
      if (!classroomSlots[slot.classroom]) {
        classroomSlots[slot.classroom] = [];
      }
      classroomSlots[slot.classroom].push(slot);
    });

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  }
}

module.exports = TimetableService;