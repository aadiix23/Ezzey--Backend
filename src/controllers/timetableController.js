const Timetable = require('../models/Timetable');
const Batch = require('../models/Batch');
const { generateMultipleTimetables, validateTimetable } = require('../timetable/algorithm');
const { generateSuggestions } = require('../services/suggestionService');

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


      if (!option.weekSlots || option.weekSlots.length === 0) {
        continue;
      }

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

    if (savedTimetables.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Could not generate a feasible timetable. This is usually due to total requested hours exceeding weekly capacity or resource (Faculty/Room) unavailability.',
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

exports.getTimetableList = async (req, res, next) => {
  try {
    const { status, batchId, limit = 10, page = 1 } = req.query;
    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (batchId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(batchId)) {
        matchStage.batch = new mongoose.Types.ObjectId(batchId);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const pipeline = [

      { $match: matchStage },


      { $sort: { createdAt: -1 } },


      {
        $group: {
          _id: {
            batch: '$batch',
            optionNumber: '$optionNumber',
          },
          doc: { $first: '$$ROOT' },
        },
      },


      { $replaceRoot: { newRoot: '$doc' } },


      {
        $project: {
          weekSlots: 0,
          suggestions: 0,
        },
      },


      { $sort: { createdAt: -1 } },


      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: Number(limit) },

            {
              $lookup: {
                from: 'batches',
                localField: 'batch',
                foreignField: '_id',
                as: 'batch',
              },
            },
            {
              $unwind: {
                path: '$batch',
                preserveNullAndEmptyArrays: false,
              },
            },

            {
              $lookup: {
                from: 'users',
                localField: 'generatedBy',
                foreignField: '_id',
                as: 'generatedBy',
              },
            },
            {
              $unwind: {
                path: '$generatedBy',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                status: 1,
                createdAt: 1,

                degree: '$batch.course',
                course: '$batch.course',
                department: '$batch.department',
                semester: '$batch.semester',
                section: '$batch.name',
                batchCode: '$batch.code',
                capacity: '$batch.strength',
                batchId: '$batch._id',


                conflictCount: 1,
                optionNumber: 1,
                optionName: 1,
                generatedBy: '$generatedBy.name',
              },
            },
          ],
        },
      },
    ];

    const result = await Timetable.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllTimetables = async (req, res, next) => {
  try {
    const { status, batchId, limit = 10, page = 1 } = req.query;
    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (batchId) {



      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(batchId)) {
        matchStage.batch = new mongoose.Types.ObjectId(batchId);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const pipeline = [

      { $match: matchStage },


      { $sort: { createdAt: -1 } },


      {
        $group: {
          _id: {
            batch: '$batch',
            optionNumber: '$optionNumber',
          },
          doc: { $first: '$$ROOT' },
        },
      },


      { $replaceRoot: { newRoot: '$doc' } },


      { $sort: { createdAt: -1 } },


      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: Number(limit) },

            {
              $lookup: {
                from: 'batches',
                localField: 'batch',
                foreignField: '_id',
                as: 'batch',
              },
            },
            {
              $unwind: {
                path: '$batch',
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $lookup: {
                from: 'users',
                localField: 'generatedBy',
                foreignField: '_id',
                as: 'generatedBy',
              },
            },
            {
              $unwind: {
                path: '$generatedBy',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
    ];

    const result = await Timetable.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

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

exports.getVisualTimetable = async (req, res, next) => {
  try {
    const timetable = await Timetable.findOne({
      batch: req.params.batchId,
      status: { $in: ['active', 'published', 'draft'] },
    })
      .populate([
        { path: 'batch' },
        { path: 'weekSlots.subject' },
        { path: 'weekSlots.faculty' },
        { path: 'weekSlots.classroom' },
      ])
      .sort({ createdAt: -1 });

    if (!timetable) {
      return res.status(404).send('<h1>Timetable not found for this batch</h1>');
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
    ];

    const grid = {};
    timeSlots.forEach(time => {
      grid[time] = {};
      days.forEach(day => {
        grid[time][day] = null;
      });
    });

    timetable.weekSlots.forEach(slot => {
      const startHour = parseInt(slot.startTime.split(':')[0], 10);
      const endHour = parseInt(slot.endTime.split(':')[0], 10);

      for (let h = startHour; h < endHour; h++) {
        const timeKey = `${h.toString().padStart(2, '0')}:00`;
        if (grid[timeKey]) {
          grid[timeKey][slot.day] = slot;
        }
      }
    });

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            :root {
                --bg: #0f0f0f;
                --card-bg: #1a1a1a;
                --text: #e0e0e0;
                --accent: #bb86fc;
                --border: #333;
                --lunch: #2d2d2d;
            }
            body {
                background-color: var(--bg);
                color: var(--text);
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .header {
                width: 100%;
                max-width: 1200px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .title { font-size: 24px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
            table {
                width: 100%;
                max-width: 1240px;
                border-collapse: separate;
                border-spacing: 0;
                border: 1px solid var(--border);
                border-radius: 12px;
                overflow: hidden;
                background: var(--card-bg);
            }
            th {
                background: #111;
                padding: 15px;
                text-align: left;
                border-bottom: 1px solid var(--border);
                font-weight: 500;
                color: #aaa;
            }
            td {
                padding: 15px;
                border-bottom: 1px solid var(--border);
                border-right: 1px solid var(--border);
                vertical-align: top;
                min-width: 180px;
            }
            td:last-child { border-right: none; }
            tr:last-child td { border-bottom: none; }
            .time-col { width: 120px; color: #aaa; font-weight: 600; border-right: 2px solid var(--border); }
            .slot-card { display: flex; flex-direction: column; gap: 4px; }
            .subject { font-weight: 600; font-size: 14px; color: #fff; }
            .sub-info { font-size: 12px; color: #888; }
            .lunch-break {
                background: var(--lunch);
                text-align: center;
                font-weight: bold;
                letter-spacing: 2px;
                color: #666;
                text-transform: uppercase;
                font-size: 13px;
                vertical-align: middle;
            }
            .empty { color: #444; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">🕒 Weekly Timetable (${timetable.batch.name})</div>
            <div style="color: #666">Code: ${timetable.batch.code}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 120px">Time</th>
                    ${days.map(d => `<th>${d}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${timeSlots.map(time => {
      if (time === '12:00') {
        return `
                      <tr>
                        <td class="time-col">12:00 - 13:00</td>
                        <td colspan="5" class="lunch-break">LUNCH BREAK</td>
                      </tr>
                    `;
      }
      const endTime = timeSlots[timeSlots.indexOf(time) + 1] || '17:00';
      return `
                    <tr>
                        <td class="time-col">${time} - ${endTime}</td>
                        ${days.map(day => {
        const slot = grid[time][day];
        if (!slot) return '<td class="empty">—</td>';
        return `
                            <td>
                                <div class="slot-card">
                                    <span class="subject">${slot.subject.name} (${slot.subject.code})</span>
                                    <span class="sub-info">${slot.faculty.name}</span>
                                    <span class="sub-info">${slot.classroom.name} (${slot.classroom.type})</span>
                                </div>
                            </td>
                          `;
      }).join('')}
                    </tr>
                  `;
    }).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

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