const Classroom = require('../models/Classroom');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Timetable = require('../models/Timetable');

/* -------------------------------------------------------------
    Helper Functions
------------------------------------------------------------- */

// 1️⃣ FACULTY UTILIZATION (detailed)
async function calculateFacultyUtilization() {
  const timetables = await Timetable.find({ status: 'approved' });

  const facultyHoursMap = {};

  timetables.forEach((tt) => {
    tt.weekSlots?.forEach((slot) => {
      if (slot.faculty) {
        facultyHoursMap[slot.faculty] =
          (facultyHoursMap[slot.faculty] || 0) + 1;
      }
    });
  });

  const faculties = await Faculty.find({ isActive: true });

  return faculties.map((f) => {
    const assigned = facultyHoursMap[f._id] || 0;
    const maxLoad = f.maxLoad || 1;

    return {
      facultyId: f._id,
      name: f.name,
      assignedHours: assigned,
      maxLoad,
      utilization: Number(((assigned / maxLoad) * 100).toFixed(2)),
    };
  });
}

// 2️⃣ CLASSROOM UTILIZATION (detailed)
async function calculateClassroomUtilization() {
  const totalPeriodsPerWeek = 6 * 7; // Change if needed
  const timetables = await Timetable.find({ status: 'approved' });

  const roomMap = {};

  timetables.forEach((tt) => {
    tt.weekSlots?.forEach((slot) => {
      if (slot.classroom) {
        roomMap[slot.classroom] =
          (roomMap[slot.classroom] || 0) + 1;
      }
    });
  });

  const rooms = await Classroom.find({ isActive: true });

  return rooms.map((room) => {
    const used = roomMap[room._id] || 0;

    return {
      classroomId: room._id,
      name: room.name,
      usedPeriods: used,
      totalPeriods: totalPeriodsPerWeek,
      utilization: Number(((used / totalPeriodsPerWeek) * 100).toFixed(2)),
    };
  });
}

// 3️⃣ BLANK PERIODS (overall OCCUPANCY %)
async function calculateBlankPeriods() {
  const periods = 6 * 7;
  const totalClassrooms = await Classroom.countDocuments({ isActive: true });

  const totalPossible = periods * totalClassrooms;

  const timetables = await Timetable.find({ status: 'approved' });

  let used = 0;
  timetables.forEach((tt) => {
    tt.weekSlots?.forEach((slot) => {
      if (slot.classroom) used++;
    });
  });

  const occupancy =
    totalPossible > 0
      ? (used / totalPossible) * 100
      : 0;

  const vacancy = totalPossible > 0 ? (100 - occupancy) : 0;

  return { vacancy: Number(vacancy.toFixed(2)) };
}

/* -------------------------------------------------------------
    DASHBOARD SUMMARY  ✅ CLEAN VERSION
------------------------------------------------------------- */

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const [
      totalClassrooms,
      totalSubjects,
      totalFaculties,
      totalTimetables,
      facultyList,
      facultyUtilizationDetails,
      classroomUtilizationDetails,
      blankPeriodsDetails,
    ] = await Promise.all([
      Classroom.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      Faculty.countDocuments({ isActive: true }),
      Timetable.countDocuments({ status: 'approved' }),
      Faculty.find({ isActive: true }).select('name'),
      calculateFacultyUtilization(),
      calculateClassroomUtilization(),
      calculateBlankPeriods(),
    ]);

    // AVG faculty utilization
    const avgFacultyUtilization =
      facultyUtilizationDetails.length > 0
        ? Number(
          (
            facultyUtilizationDetails.reduce(
              (sum, f) => sum + f.utilization,
              0
            ) / facultyUtilizationDetails.length
          ).toFixed(2)
        )
        : 0;

    // AVG classroom utilization
    const avgClassroomUtilization =
      classroomUtilizationDetails.length > 0
        ? Number(
          (
            classroomUtilizationDetails.reduce(
              (sum, r) => sum + r.utilization,
              0
            ) / classroomUtilizationDetails.length
          ).toFixed(2)
        )
        : 0;

    // Blank periods = vacancy %
    const blankPeriods = blankPeriodsDetails.vacancy || 0;

    res.status(200).json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: {
        totalClassrooms,
        totalSubjects,
        totalFaculties,
        totalApprovedTimetables: totalTimetables,
        facultyList,

        // FINAL data your UI needs (only 3 numbers)
        quickReport: {
          facultyUtilization: avgFacultyUtilization,
          classroomUtilization: avgClassroomUtilization,
          blankPeriods: blankPeriods,
        },
        user: {
          fullName: req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------
    EXTENDED DASHBOARD (unchanged)
------------------------------------------------------------- */

exports.getExtendedDashboard = async (req, res, next) => {
  try {
    const totalClassrooms = await Classroom.countDocuments({ isActive: true });
    const totalSubjects = await Subject.countDocuments({ isActive: true });
    const totalFaculties = await Faculty.countDocuments({ isActive: true });

    const classroomsByType = await Classroom.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const subjectsByType = await Subject.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const totalTimetables = await Timetable.countDocuments();
    const timetablesByStatus = await Timetable.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      message: 'Extended dashboard data retrieved successfully',
      data: {
        summary: {
          totalClassrooms,
          totalSubjects,
          totalFaculties,
          totalTimetables,
        },
        breakdown: {
          classroomsByType,
          subjectsByType,
          timetablesByStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------
    DASHBOARD STATS (unchanged)
------------------------------------------------------------- */

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalClassrooms = await Classroom.countDocuments({ isActive: true });
    const totalSubjects = await Subject.countDocuments({ isActive: true });
    const totalFaculties = await Faculty.countDocuments({ isActive: true });

    const recentTimetables = await Timetable.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate(['batch', 'generatedBy'])
      .select('_id batch status createdAt optionName generatedBy');

    const draftTimetables = await Timetable.countDocuments({
      status: 'draft',
    });
    const approvedTimetables = await Timetable.countDocuments({
      status: 'approved',
    });
    const rejectedTimetables = await Timetable.countDocuments({
      status: 'rejected',
    });

    res.status(200).json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: {
        counts: {
          totalClassrooms,
          totalSubjects,
          totalFaculties,
        },
        timetables: {
          draft: draftTimetables,
          approved: approvedTimetables,
          rejected: rejectedTimetables,
          total: draftTimetables + approvedTimetables + rejectedTimetables,
        },
        recentTimetables: recentTimetables.map((tt) => ({
          id: tt._id,
          batch: tt.batch?.name || 'Unknown',
          status: tt.status,
          option: tt.optionName,
          generatedBy: tt.generatedBy?.name || 'Unknown',
          createdAt: tt.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
