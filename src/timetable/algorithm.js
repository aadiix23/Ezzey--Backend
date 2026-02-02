/**
 * Timetable Generation Algorithm - Enterprise Grade (LP Version)
 * * FEATURES:
 * 1. Global Conflict Awareness: Checks other batches' schedules first.
 * 2. Deterministic: Uses Linear Programming for optimal results.
 * 3. Robust: Handles room capacity fallbacks gracefully.
 */

const solver = require('javascript-lp-solver');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');

const timeSlots = [
  { id: '09:00', start: '09:00', end: '10:00', label: 'morning' },
  { id: '10:00', start: '10:00', end: '11:00', label: 'morning' },
  { id: '11:00', start: '11:00', end: '12:00', label: 'morning' },

  { id: '13:00', start: '13:00', end: '14:00', label: 'afternoon' },
  { id: '14:00', start: '14:00', end: '15:00', label: 'afternoon' },
  { id: '15:00', start: '15:00', end: '16:00', label: 'afternoon' },
  { id: '16:00', start: '16:00', end: '17:00', label: 'evening' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Utility: Fetch slots that are ALREADY taken by other batches
 * Prevents Dr. Smith from being booked in Section A and Section B at the same time.
 */
const getBusySlots = async () => {

  const existingSchedules = await Timetable.find({ status: { $in: ['active', 'published'] } });

  const busy = {
    faculty: {},
    rooms: {}
  };

  existingSchedules.forEach(schedule => {
    if (!schedule.weekSlots) return;

    schedule.weekSlots.forEach(slot => {
      const timeKey = `${slot.day}-${slot.startTime}`;

      if (slot.faculty) {
        const fid = slot.faculty.toString();
        if (!busy.faculty[fid]) busy.faculty[fid] = [];
        busy.faculty[fid].push(timeKey);
      }

      if (slot.classroom) {
        const rid = slot.classroom.toString();
        if (!busy.rooms[rid]) busy.rooms[rid] = [];
        busy.rooms[rid].push(timeKey);
      }
    });
  });

  return busy;
};

/**
 * Utility: Sort slots by day and time
 */
const sortSlotsByDayAndTime = (slots) => {
  const dayOrder = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 };
  const getMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  return slots.sort((a, b) => {
    const dayDiff = dayOrder[a.day] - dayOrder[b.day];
    if (dayDiff !== 0) return dayDiff;
    return getMinutes(a.startTime) - getMinutes(b.startTime);
  });
};

/**
 * MAIN FUNCTION: Generate Single Optimal Timetable
 */
/**
 * MAIN FUNCTION: Generate Single Optimal Timetable (Heuristic / Greedy)
 * Advantage: Extremely Fast (<100ms)
 */
const generateTimetable = async (batch) => {
  console.log(`🚀 Generating Timetable (Heuristic) for: ${batch.name}`);


  const busySlots = await getBusySlots();
  const allClassrooms = await Classroom.find({ isActive: true }).sort({ capacity: 1 });

  const lectureRooms = allClassrooms.filter(r => ['lecture', 'seminar'].includes(r.type));
  const labRooms = allClassrooms.filter(r => r.type === 'lab');



  const sortedSubjects = [...batch.subjects].sort((a, b) => {
    const durA = (a.subject.type === 'lab' ? a.subject.hoursPerWeek : 1);
    const durB = (b.subject.type === 'lab' ? b.subject.hoursPerWeek : 1);
    if (durA !== durB) return durB - durA;
    return (b.subject.hoursPerWeek || 0) - (a.subject.hoursPerWeek || 0);
  });

  const resultSlots = [];


  const batchBusy = {
    faculty: new Set(),
    rooms: new Set(),
    subjectDaily: {}
  };

  const isSlotBusy = (facId, roomId, day, time) => {
    const timeKey = `${day}-${time}`;


    if (busySlots.faculty[facId]?.includes(timeKey)) return true;
    if (busySlots.rooms[roomId]?.includes(timeKey)) return true;


    if (batchBusy.faculty.has(`${facId}-${timeKey}`)) return true;
    if (batchBusy.rooms.has(`${roomId}-${timeKey}`)) return true;

    return false;
  };


  for (const subjectEntry of sortedSubjects) {
    const { subject, faculty } = subjectEntry;
    if (!subject || !faculty) continue;

    console.log(`... Processing ${subject.name} (${subject.hoursPerWeek}h)`);

    const hoursNeeded = subject.hoursPerWeek || 3;
    const subId = subject._id.toString();
    const facId = faculty._id.toString();
    const isLab = subject.type === 'lab';


    const MAX_LAB_BLOCK_SIZE = 2;
    // We will calculate blockDuration inside the loop to handle remaining hours correctly
    // e.g. if 3 hours needed: 2 hours then 1 hour.

    let hoursRemaining = hoursNeeded;

    // Estimate iterations (safe upper bound)
    const isMultiHour = isLab; // Assuming multi-hour blocks are only for labs
    const iterations = isMultiHour ? Math.ceil(hoursNeeded / MAX_LAB_BLOCK_SIZE) : hoursNeeded;

    let assignedCount = 0;

    for (let i = 0; i < iterations && hoursRemaining > 0; i++) {
      const blockDuration = isMultiHour ? Math.min(hoursRemaining, MAX_LAB_BLOCK_SIZE) : 1;
      let placed = false;



      for (const day of days) {
        if (placed) break;


        const dayCount = batchBusy.subjectDaily[`${subId}-${day}`] || 0;
        if (dayCount >= 1) continue;

        for (let t = 0; t < timeSlots.length; t++) {

          if (t + blockDuration > timeSlots.length) break;






          if (t <= 2 && (t + blockDuration > 3)) continue;

          let facultyFree = true;
          for (let k = 0; k < blockDuration; k++) {


            if (isSlotBusy(facId, 'dummy', day, timeSlots[t + k].start)) {
              facultyFree = false;
              break;
            }
          }
          if (!facultyFree) continue;

          const roomPool = isLab ? labRooms : lectureRooms;
          const bestRoom = roomPool.find(room => {
            if (room.capacity < batch.strength) return false;

            for (let k = 0; k < blockDuration; k++) {
              if (isSlotBusy(facId, room._id.toString(), day, timeSlots[t + k].start)) {
                return false;
              }
            }
            return true;
          });

          if (bestRoom) {

            placed = true;

            for (let k = 0; k < blockDuration; k++) {
              const slotTime = timeSlots[t + k].start;
              const slotKey = `${day}-${slotTime}`;

              batchBusy.faculty.add(`${facId}-${slotKey}`);
              batchBusy.rooms.add(`${bestRoom._id.toString()}-${slotKey}`);
            }

            resultSlots.push({
              day,
              startTime: timeSlots[t].start,
              endTime: timeSlots[t + blockDuration - 1].end,
              subject: subject._id,
              faculty: faculty._id,
              classroom: bestRoom._id,
              classroom: bestRoom._id,
              type: subject.type
            });

            hoursRemaining -= blockDuration;
            console.log(`   ✅ Scheduled: ${subject.name} on ${day} ${timeSlots[t].start}-${timeSlots[t + blockDuration - 1].end} (${blockDuration}h)`);

            const dayKey = `${subId}-${day}`;
            batchBusy.subjectDaily[dayKey] = (batchBusy.subjectDaily[dayKey] || 0) + 1;

            break;
          }
        }
      }

      if (!placed) {
        console.warn(`⚠️  Unable to schedule ${subject.name} (${subject.type}) - iteration ${i + 1}/${iterations}. No valid slots/rooms found for ${blockDuration}-hour block.`);

        break;
      }
      assignedCount++;
    }

    console.log(`   📊 ${subject.name}: Scheduled ${assignedCount}/${iterations} blocks`);
  }

  return sortSlotsByDayAndTime(resultSlots);
};

/**
 * WRAPPER: Matches Controller Expectation
 */
const { generateTimetableGA } = require('./genetic/engine');

const generateMultipleTimetables = async (batch) => {



  console.log('🔄 Switching to Genetic Algorithm for generation...');
  const gaResult = await generateTimetableGA(batch);

  return [
    {
      option: 1,
      name: 'Optimized Schedule (Genetic Algorithm)',
      description: 'Conflict-free schedule with balanced load and minimized gaps.',
      weekSlots: gaResult
    }
  ];
};

/**
 * Validation Helper
 */
const validateTimetable = (weekSlots) => {
  const conflicts = { facultyOverlaps: [], classroomOverlaps: [] };
  const getSlotKey = (s) => `${s.day}-${s.startTime}`;
  const facultyMap = {};
  const roomMap = {};

  weekSlots.forEach(slot => {
    const fid = slot.faculty.toString();
    const rid = slot.classroom.toString();
    const key = getSlotKey(slot);

    if (facultyMap[fid]?.includes(key)) conflicts.facultyOverlaps.push({ faculty: fid, time: key });
    else (facultyMap[fid] = facultyMap[fid] || []).push(key);

    if (roomMap[rid]?.includes(key)) conflicts.classroomOverlaps.push({ room: rid, time: key });
    else (roomMap[rid] = roomMap[rid] || []).push(key);
  });

  return { isValid: conflicts.facultyOverlaps.length === 0 && conflicts.classroomOverlaps.length === 0, conflicts };
};

module.exports = {
  generateMultipleTimetables,
  generateTimetable,
  validateTimetable,
};