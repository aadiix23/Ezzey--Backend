const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    day: String,
    startTime: String,
    endTime: String,
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
    },
    type: {
      type: String,
      enum: ['theory', 'lab', 'practical', 'seminar'],
    },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Please provide batch'],
    },
    weekSlots: [slotSchema],
    version: {
      type: Number,
      default: 1,
    },
    optionNumber: {
      type: Number,
      enum: [1, 2, 3],
    },
    optionName: {
      type: String,
      enum: [
        'Sequential (Morning to Evening)',
        'Distributed (Balanced Load)',
        'Grouped (Theory & Labs Separated)',
      ],
    },
    optionDescription: String,
    isOptimized: {
      type: Boolean,
      default: false,
    },
    conflictCount: {
      type: Number,
      default: 0,
    },
    suggestions: [String],
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'rejected'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Timetable', timetableSchema);