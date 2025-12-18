const express = require('express');
const {
  createFaculty,
  getFaculties,
  updateFaculty,
  deleteFaculty,
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getFaculties);
router.post('/', protect, authorize('admin', 'coordinator'), createFaculty);
router.patch('/:id', protect, authorize('admin', 'coordinator'), updateFaculty);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteFaculty);

module.exports = router;