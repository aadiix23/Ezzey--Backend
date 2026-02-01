const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const XLSX = require('xlsx');

// Helper to resolve subject codes/IDs to ObjectIDs
async function resolveSubjects(subjectsInput) {
  if (!subjectsInput || !Array.isArray(subjectsInput)) return undefined;

  const resolvedIds = [];
  const codesToFind = [];

  const mongoose = require('mongoose');

  subjectsInput.forEach((item) => {
    if (mongoose.Types.ObjectId.isValid(item)) {
      resolvedIds.push(item);
    } else {
     
      codesToFind.push(String(item).trim().toUpperCase());
    }
  });

  if (codesToFind.length > 0) {
    const foundSubjects = await Subject.find({ code: { $in: codesToFind } });
    foundSubjects.forEach((s) => resolvedIds.push(s._id));
  }

  return resolvedIds;
}

exports.createFaculty = async (req, res, next) => {
  try {
    const { subjects, ...otherData } = req.body;

   
    let subjectIds = subjects;
    if (subjects) {
      subjectIds = await resolveSubjects(subjects);
    }

    const faculty = await Faculty.create({
      ...otherData,
      subjects: subjectIds
    });

    await faculty.populate('subjects');

    res.status(201).json({
      success: true,
      message: 'Faculty created successfully',
      data: faculty,
    });
  } catch (error) {
    next(error);
  }
};

// ... existing getFaculties ... (NOT REPLACING THIS PART, BUT SHOWING CONTEXT)

exports.bulkUploadFaculties = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File is empty',
      });
    }

    const results = { successful: [], failed: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.name || !row.email) {
          throw new Error('Missing name or email');
        }

       
        const subjectIds = [];
        if (row.subjects) {
         
          const codes = String(row.subjects).split(',').map(c => c.trim().toUpperCase());
          const foundSubjects = await Subject.find({ code: { $in: codes } });
          foundSubjects.forEach(s => subjectIds.push(s._id));
        }

       
        let faculty = await Faculty.findOne({ email: row.email.toLowerCase() });

        const facultyData = {
          name: row.name.trim(),
          email: row.email.toLowerCase(),
          maxLoad: Number(row.maxLoad) || 20,
          subjects: subjectIds,
          isActive: true
        };

        if (faculty) {
          faculty = await Faculty.findByIdAndUpdate(faculty._id, facultyData, { new: true });
        } else {
          faculty = await Faculty.create(facultyData);
        }

        results.successful.push({ row: i + 2, name: faculty.name, subjectsCount: subjectIds.length });
      } catch (err) {
        results.failed.push({ row: i + 2, reason: err.message, data: row });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.successful.length} faculties`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

exports.getFaculties = async (req, res, next) => {
  try {
    const faculties = await Faculty.find({ isActive: true }).populate('subjects');
    res.status(200).json({
      success: true,
      count: faculties.length,
      data: faculties,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFaculty = async (req, res, next) => {
  try {
    const { subjects, ...otherData } = req.body;

   
    let updateData = { ...otherData };
    if (subjects) {
      updateData.subjects = await resolveSubjects(subjects);
    }

    const faculty = await Faculty.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('subjects');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Faculty updated successfully',
      data: faculty,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Faculty deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};