const Subject = require('../models/Subject');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const csv = require('csv-parser');

exports.createSubject = async (req, res, next) => {
  try {
    const { course, semester, section } = req.body;

    if (!course || String(course).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Course is required',
      });
    }

    if (semester === undefined || semester === null || String(semester).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Semester is required',
      });
    }

    if (!section || String(section).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Section is required',
      });
    }

    const subject = await Subject.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ isActive: true });
    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadSubjects = async (req, res, next) => {
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please upload a .xlsx or .csv file.',
      });
    }

    uploadedFilePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (!['.xlsx', '.csv'].includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only .xlsx and .csv files are supported.',
      });
    }

    let rows = [];

    if (fileExtension === '.xlsx') {
      rows = await parseExcelFile(uploadedFilePath);
    } else if (fileExtension === '.csv') {
      rows = await parseCSVFile(uploadedFilePath);
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File is empty or has no valid data rows.',
      });
    }

   
    const subjectsToInsert = [];
    let skipped = 0;

    for (const row of rows) {
     
      const sanitizedRow = sanitizeRow(row);

      if (
        !sanitizedRow.code ||
        !sanitizedRow.name ||
        !sanitizedRow.course ||
        sanitizedRow.semester === null ||
        !sanitizedRow.section ||
        !sanitizedRow.department ||
        sanitizedRow.hoursPerWeek === null
      ) {
        skipped++;
        continue;
      }

      subjectsToInsert.push({
        code: sanitizedRow.code.toUpperCase(),
        name: sanitizedRow.name,
        course: sanitizedRow.course,
        semester: sanitizedRow.semester,
        section: sanitizedRow.section,
        department: sanitizedRow.department,
        hoursPerWeek: sanitizedRow.hoursPerWeek,
        type: sanitizedRow.type || 'theory',
        isElective: sanitizedRow.isElective || false,
        isActive: true,
      });
    }

   
    let insertedCount = 0;
    if (subjectsToInsert.length > 0) {
      try {
        await Subject.insertMany(subjectsToInsert, { ordered: false });
        insertedCount = subjectsToInsert.length;
      } catch (insertError) {
        if (insertError.writeErrors) {
          insertedCount = subjectsToInsert.length - insertError.writeErrors.length;
          skipped += insertError.writeErrors.length;
        }
      }
    }

   
    res.status(201).json({
      success: true,
      inserted: insertedCount,
      skipped: rows.length - insertedCount,
      message: 'Subjects uploaded successfully',
    });
  } catch (error) {
    next(error);
  } finally {
   
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
  }
};

/**
 * Parse Excel file and return rows
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Array>} Array of parsed rows
 */
async function parseExcelFile(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return resolve([]);
      }
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Parse CSV file and return rows
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} Array of parsed rows
 */
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Sanitize and validate a single row
 * @param {Object} row - Row from parsed file
 * @returns {Object} Sanitized row with properly typed values
 */
function sanitizeRow(row) {
  const sanitized = {};

 
  sanitized.code = row.code ? String(row.code).trim() : null;
  sanitized.name = row.name ? String(row.name).trim() : null;
  sanitized.course = row.course ? String(row.course).trim() : null;
  sanitized.section = row.section ? String(row.section).trim() : null;
  sanitized.department = row.department ? String(row.department).trim() : null;
  sanitized.type = row.type ? String(row.type).trim().toLowerCase() : 'theory';

  const semesterValue = parseInt(row.semester, 10);
  sanitized.semester = isNaN(semesterValue) ? null : semesterValue;

  const hoursValue = parseFloat(row.hoursPerWeek);
  sanitized.hoursPerWeek = isNaN(hoursValue) ? null : hoursValue;

  const isElectiveValue = row.isElective;
  if (typeof isElectiveValue === 'boolean') {
    sanitized.isElective = isElectiveValue;
  } else if (typeof isElectiveValue === 'string') {
    sanitized.isElective = ['true', '1', 'yes', 'y'].includes(
      isElectiveValue.trim().toLowerCase()
    );
  } else if (typeof isElectiveValue === 'number') {
    sanitized.isElective = isElectiveValue === 1;
  } else {
    sanitized.isElective = false;
  }

  return sanitized;
}