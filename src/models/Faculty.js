const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a faculty name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    maxLoad: {
      type: Number,
      required: [true, 'Please provide max teaching hours per week'],
      min: 1,
    },
    leavesPerMonth: {
      type: Number,
      default: 0,
    },
    specialAvailability: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpecialSlot',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Faculty', facultySchema);