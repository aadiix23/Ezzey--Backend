const express = require('express');
const {
  createBatch,
  getBatches,
  updateBatch,
  deleteBatch,
  seedFullBatch,
  addSubjectsToBatch,
} = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getBatches);
router.post('/', protect, authorize('admin', 'coordinator'), createBatch);
router.get('/seed-full', seedFullBatch);

router.patch('/:id', protect, authorize('admin', 'coordinator'), updateBatch);
router.post('/:id/subjects', protect, authorize('admin', 'coordinator'), addSubjectsToBatch);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteBatch);

module.exports = router;