const SpecialSlot = require('../models/SpecialSlot');

// @desc    Create a special slot
// @route   POST /special-slots
// @access  Private/Admin
exports.createSpecialSlot = async (req, res, next) => {
  try {
    const slot = await SpecialSlot.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Special slot created successfully',
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all special slots
// @route   GET /special-slots
// @access  Private
exports.getSpecialSlots = async (req, res, next) => {
  try {
    const slots = await SpecialSlot.find().sort({ day: 1, startTime: 1 });
    res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete special slot
// @route   DELETE /special-slots/:id
// @access  Private/Admin
exports.deleteSpecialSlot = async (req, res, next) => {
  try {
    const slot = await SpecialSlot.findByIdAndDelete(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Special slot not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Special slot deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};