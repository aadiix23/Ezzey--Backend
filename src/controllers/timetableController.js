const Timetable = require('../models/Timetable');
const Batch = require('../models/Batch');
const { generateMultipleTimetables, validateTimetable } = require('../timetable/algorithm');
const { generateSuggestions } = require('../services/suggestionService');

// @desc    Generate multiple timetable options
// @route   POST /timetable/generate
// @access  Private
exports.generateTimetable = async (req, res, next) => {
  try {
    const { batchId } = req.body;

    if (!batchId || batchId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required',
      });
    }

    const batch = await Batch.findById(batchId).populate({
      path: 'subjects',
      populate: [
        { path: 'subject' },
        { path: 'faculty' },
      ],
    });

    if (!batch) {
      console.error('❌ Batch not found:', batchId);
      return res.status(404).json({
        success: false,
        message: `Batch with ID ${batchId} not found`,
      });
    }

    if (!batch.subjects || batch.subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Batch must have at least one subject assigned',
      });
    }

    const invalidSubjects = [];
    batch.subjects.forEach((s, index) => {
      if (!s.subject) {
        invalidSubjects.push({ index, issue: 'Subject not populated' });
      }
      if (!s.faculty) {
        invalidSubjects.push({
          index,
          issue: 'Faculty not assigned',
          subject: s.subject?.name || 'Unknown',
        });
      }
    });

    if (invalidSubjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${invalidSubjects.length} subject(s) have missing data`,
        invalidSubjects,
      });
    }

    let timetableOptions;
    try {
      timetableOptions = await generateMultipleTimetables(batch);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Timetable generation failed: ${error.message}`,
      });
    }

    const suggestions = generateSuggestions(batch);

    const savedTimetables = [];

    for (let i = 0; i < timetableOptions.length; i++) {
      const option = timetableOptions[i];

      const validation = validateTimetable(option.weekSlots);
      const timetable = await Timetable.create({
        batch: batchId,
        weekSlots: option.weekSlots,
        generatedBy: req.user.id,
        isOptimized: true,
        conflictCount: validation.conflicts.facultyOverlaps.length,
        suggestions,
        status: 'draft',
        version: 1,
        optionName: option.name,
        optionDescription: option.description,
        optionNumber: option.option,
      });

      await timetable.populate([
        { path: 'batch' },
        { path: 'weekSlots.subject' },
        { path: 'weekSlots.faculty' },
        { path: 'weekSlots.classroom' },
        { path: 'generatedBy' },
      ]);

      savedTimetables.push({
        option: option.option,
        name: option.name,
        description: option.description,
        timetableId: timetable._id,
        weekSlots: timetable.weekSlots,
        conflictCount: timetable.conflictCount,
        suggestions: timetable.suggestions,
        status: timetable.status,
        createdAt: timetable.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Timetable generated sucessfully',
      batchInfo: {
        batchId: batch._id,
        batchName: batch.name,
        batchCode: batch.code,
        subjects: batch.subjects.length,
        strength: batch.strength,
      },
      options: savedTimetables,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save selected timetable
// @route   POST /timetable/save
// @access  Private
exports.saveTimetable = async (req, res, next) => {
  try {
    const { timetableId, status } = req.body;

    if (!timetableId) {
      return res.status(400).json({
        success: false,
        message: 'Timetable ID is required',
      });
    }

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found',
      });
    }

    timetable.status = status || timetable.status;
    await timetable.save();

    await timetable.populate([
      { path: 'batch' },
      { path: 'weekSlots.subject' },
      { path: 'weekSlots.faculty' },
      { path: 'weekSlots.classroom' },
    ]);

    res.status(200).json({
      success: true,
      message: `Timetable ${status || 'saved'} successfully`,
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get timetable by ID
// @route   GET /timetable/:id
// @access  Private
exports.getTimetableById = async (req, res, next) => {
  try {
    const timetable = await Timetable.findById(req.params.id).populate([
      { path: 'batch' },
      { path: 'weekSlots.subject' },
      { path: 'weekSlots.faculty' },
      { path: 'weekSlots.classroom' },
      { path: 'generatedBy' },
    ]);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found',
      });
    }

    res.status(200).json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all timetables for batch
// @route   GET /timetable/batch/:batchId
// @access  Private
exports.getTimetableByBatch = async (req, res, next) => {
  try {
    const timetables = await Timetable.find({
      batch: req.params.batchId,
    })
      .populate([
        { path: 'batch' },
        { path: 'weekSlots.subject' },
        { path: 'weekSlots.faculty' },
        { path: 'weekSlots.classroom' },
        { path: 'generatedBy' },
      ])
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get timetables by faculty
// @route   GET /timetable/faculty/:facultyId
// @access  Private
exports.getTimetableByFaculty = async (req, res, next) => {
  try {
    const timetables = await Timetable.find({
      'weekSlots.faculty': req.params.facultyId,
    })
      .populate([
        { path: 'batch' },
        { path: 'weekSlots.subject' },
        { path: 'weekSlots.faculty' },
        { path: 'weekSlots.classroom' },
        { path: 'generatedBy' },
      ])
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get suggestions
// @route   POST /timetable/suggestions
// @access  Private
exports.generateSuggestionsForTimetable = async (req, res, next) => {
  try {
    const { batchId } = req.body;

    const batch = await Batch.findById(batchId).populate({
      path: 'subjects',
      populate: [
        { path: 'subject' },
        { path: 'faculty' },
      ],
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const suggestions = generateSuggestions(batch);

    res.status(200).json({
      success: true,
      data: {
        suggestions,
        batchId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete timetable
// @route   DELETE /timetable/:id
// @access  Private/Admin
exports.deleteTimetable = async (req, res, next) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Timetable deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};