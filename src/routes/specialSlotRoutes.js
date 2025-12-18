const express = require('express');
const {
  createSpecialSlot,
  getSpecialSlots,
  deleteSpecialSlot,
} = require('../controllers/specialSlotController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getSpecialSlots);
router.post('/', protect, authorize('admin', 'coordinator'), createSpecialSlot);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteSpecialSlot);

module.exports = router;