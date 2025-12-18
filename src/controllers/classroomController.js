const Classroom = require('../models/Classroom');

// @desc    Create a classroom
// @route   POST /classrooms
// @access  Private/Admin
exports.createClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: classroom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all classrooms
// @route   GET /classrooms
// @access  Private
exports.getClassrooms = async (req, res, next) => {
  try {
    const classrooms = await Classroom.find({ isActive: true });
    res.status(200).json({
      success: true,
      count: classrooms.length,
      data: classrooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update classroom
// @route   PATCH /classrooms/:id
// @access  Private/Admin
exports.updateClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Classroom updated successfully',
      data: classroom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete classroom
// @route   DELETE /classrooms/:id
// @access  Private/Admin
exports.deleteClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Classroom deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};