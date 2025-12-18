const Batch = require('../models/Batch');

// @desc    Create a batch
// @route   POST /batches
// @access  Private/Admin
exports.createBatch = async (req, res, next) => {
  try {
    const batch = await Batch.create(req.body);
    await batch.populate('subjects.subject subjects.faculty');

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all batches
// @route   GET /batches
// @access  Private
exports.getBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find({ isActive: true }).populate(
      'subjects.subject subjects.faculty'
    );
    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PATCH /batches/:id
// @access  Private/Admin
exports.updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, {
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
      message: 'Batch updated successfully',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch
// @route   DELETE /batches/:id
// @access  Private/Admin
exports.deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};