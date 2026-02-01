const SpecialSlot = require('../models/SpecialSlot');

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