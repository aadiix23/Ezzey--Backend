const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a classroom name'],
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Please provide capacity'],
      min: 1,
    },
    type: {
      type: String,
      enum: ['lecture', 'lab', 'seminar'],
      default: 'lecture',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Classroom', classroomSchema);