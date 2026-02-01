const Batch = require('../models/Batch');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');

const autoAssignFaculty = async (subjectsInput) => {
  const assignments = [];

  for (const subjectInput of subjectsInput) {

    const subjectId = subjectInput.subject || subjectInput;
    const isElective = subjectInput.isElective || false;


    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new Error(`Subject with ID ${subjectId} not found`);
    }


    const qualifiedFaculty = await Faculty.find({
      subjects: subjectId,
      isActive: true,
    });

    if (qualifiedFaculty.length === 0) {
      throw new Error(
        `No qualified faculty found for subject: ${subject.name} (${subject.code}). Please assign this subject to at least one faculty member first.`
      );
    }


    const facultyWithWorkload = await Promise.all(
      qualifiedFaculty.map(async (faculty) => {

        const batches = await Batch.find({
          'subjects.faculty': faculty._id,
          isActive: true,
        }).populate('subjects.subject');


        let totalHours = 0;
        batches.forEach((batch) => {
          batch.subjects.forEach((sub) => {
            if (sub.faculty.toString() === faculty._id.toString()) {
              totalHours += sub.subject.hoursPerWeek || 0;
            }
          });
        });

        return {
          faculty,
          currentLoad: totalHours,
          availableLoad: faculty.maxLoad - totalHours,
        };
      })
    );


    const availableFaculty = facultyWithWorkload.filter(
      (f) => f.availableLoad >= subject.hoursPerWeek
    );

    if (availableFaculty.length === 0) {

      const leastLoaded = facultyWithWorkload.reduce((prev, current) =>
        prev.availableLoad > current.availableLoad ? prev : current
      );


      assignments.push({
        subject: subjectId,
        faculty: leastLoaded.faculty._id,
        isElective,
      });
    } else {

      const bestFaculty = availableFaculty.reduce((prev, current) =>
        prev.availableLoad > current.availableLoad ? prev : current
      );

      assignments.push({
        subject: subjectId,
        faculty: bestFaculty.faculty._id,
        isElective,
      });
    }
  }

  return assignments;
};

exports.createBatch = async (req, res, next) => {
  try {
    const batchData = { ...req.body };


    if (batchData.subjects && batchData.subjects.length > 0) {

      const needsAutoAssignment = batchData.subjects.some(
        (sub) => !sub.faculty
      );

      if (needsAutoAssignment) {
        batchData.subjects = await autoAssignFaculty(batchData.subjects);
      }
    }

    const batch = await Batch.create(batchData);
    await batch.populate('subjects.subject subjects.faculty');

    res.status(201).json({
      success: true,
      message: 'Batch created successfully with auto-assigned faculty',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBatches = async (req, res, next) => {
  try {


    const batches = await Batch.find({ isActive: true }).populate(
      'subjects.subject subjects.faculty'
    );

    const formattedBatches = batches.map(batch => ({
      _id: batch._id,
      degree: batch.course,
      course: batch.course,
      batchCode: batch.code,
      department: batch.department,
      capacity: batch.strength,
      semester: batch.semester,
      section: batch.name,
      assignedSubjects: batch.subjects ? batch.subjects.length : 0,


      raw: batch
    }));

    res.status(200).json({
      success: true,
      count: formattedBatches.length,
      data: formattedBatches,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBatch = async (req, res, next) => {
  try {
    const updateData = { ...req.body };


    if (updateData.subjects && updateData.subjects.length > 0) {
      const needsAutoAssignment = updateData.subjects.some(
        (sub) => !sub.faculty
      );

      if (needsAutoAssignment) {
        updateData.subjects = await autoAssignFaculty(updateData.subjects);
      }
    }

    const batch = await Batch.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('subjects.subject subjects.faculty');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully with auto-assigned faculty',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

exports.addSubjectsToBatch = async (req, res, next) => {
  try {
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of subjects',
      });
    }


    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }


    const newAssignments = await autoAssignFaculty(subjects);


    const existingSubjectIds = batch.subjects.map((s) =>
      s.subject.toString()
    );

    newAssignments.forEach((assignment) => {
      if (!existingSubjectIds.includes(assignment.subject.toString())) {
        batch.subjects.push(assignment);
      }
    });

    await batch.save();
    await batch.populate('subjects.subject subjects.faculty');

    res.status(200).json({
      success: true,
      message: `${newAssignments.length} subject(s) added with auto-assigned faculty`,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};


exports.deleteBatch = async (req, res, next) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

exports.seedFullBatch = async (req, res, next) => {
  try {
    const Subject = require('../models/Subject');
    const Faculty = require('../models/Faculty');


    const facultyNames = ['Dr. Alpha', 'Dr. Beta', 'Dr. Gamma', 'Dr. Delta', 'Dr. Epsilon'];
    const facultyIds = [];

    for (const name of facultyNames) {
      const email = `${name.replace(/ /g, '').toLowerCase()}@test.com`;
      let fac = await Faculty.findOne({ email });
      if (!fac) {
        fac = await Faculty.create({
          name,
          email,
          maxLoad: 20,
          department: 'CSE'
        });
      }
      facultyIds.push(fac._id);
    }

    const subjectsData = [
      { name: 'Full Stack Lab', code: 'FSL101', type: 'lab', hoursPerWeek: 4, facultyIdx: 0 },
      { name: 'AI/ML Lab', code: 'AIL102', type: 'lab', hoursPerWeek: 4, facultyIdx: 1 },
      { name: 'Advanced Algorithms', code: 'CS501', type: 'theory', hoursPerWeek: 5, facultyIdx: 2 },
      { name: 'System Design', code: 'CS502', type: 'theory', hoursPerWeek: 5, facultyIdx: 3 },
      { name: 'Cloud Computing', code: 'CS503', type: 'theory', hoursPerWeek: 5, facultyIdx: 4 },
      { name: 'Cyber Security', code: 'CS504', type: 'theory', hoursPerWeek: 4, facultyIdx: 0 },
      { name: 'Data Visualization', code: 'CS505', type: 'theory', hoursPerWeek: 4, facultyIdx: 1 },
      { name: 'Technical Seminar', code: 'SEM101', type: 'seminar', hoursPerWeek: 4, facultyIdx: 2 },
    ];

    const batchSubjectsConfig = [];

    for (const sub of subjectsData) {
      let s = await Subject.findOne({ code: sub.code });
      if (s) {
        s.hoursPerWeek = sub.hoursPerWeek;
        await s.save();
      } else {
        s = await Subject.create({
          name: sub.name,
          code: sub.code,
          type: sub.type,
          department: 'CSE',
          credits: 4,
          hoursPerWeek: sub.hoursPerWeek,
          semester: 6
        });
      }
      batchSubjectsConfig.push({
        subject: s._id,
        faculty: facultyIds[sub.facultyIdx]
      });
    }


    const batchCode = 'CSE_FULL_2025';
    let batch = await Batch.findOne({ code: batchCode });

    const batchData = {
      name: 'Section Full-Pack',
      code: batchCode,
      course: 'B.Tech',
      department: 'CSE',
      semester: 6,
      strength: 60,
      subjects: batchSubjectsConfig,
      isActive: true
    };

    if (batch) {
      Object.assign(batch, batchData);
      await batch.save();
    } else {
      batch = await Batch.create(batchData);
    }

    res.status(200).json({
      success: true,
      message: 'Full Batch Seeding Completed',
      data: batch
    });

  } catch (error) {
    next(error);
  }
};