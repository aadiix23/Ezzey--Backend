const express = require('express');
const {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getSubjects);
router.post('/', protect, authorize('admin', 'coordinator'), createSubject);
router.patch('/:id', protect, authorize('admin', 'coordinator'), updateSubject);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteSubject);

module.exports = router;