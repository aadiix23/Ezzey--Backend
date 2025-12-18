const Faculty = require('../models/Faculty');

// @desc    Create a faculty
// @route   POST /faculties
// @access  Private/Admin
exports.createFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.create(req.body);
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

// @desc    Get all faculties
// @route   GET /faculties
// @access  Private
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

// @desc    Update faculty
// @route   PATCH /faculties/:id
// @access  Private/Admin
exports.updateFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, {
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

// @desc    Delete faculty
// @route   DELETE /faculties/:id
// @access  Private/Admin
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