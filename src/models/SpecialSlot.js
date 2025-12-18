const mongoose = require('mongoose');

const specialSlotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a special slot name'],
      trim: true,
    },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: [true, 'Please provide a day'],
    },
    startTime: {
      type: String,
      required: [true, 'Please provide start time (HH:MM)'],
    },
    endTime: {
      type: String,
      required: [true, 'Please provide end time (HH:MM)'],
    },
    type: {
      type: String,
      enum: ['fixed', 'blocked', 'assembly', 'maintenance'],
      default: 'fixed',
    },
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpecialSlot', specialSlotSchema);