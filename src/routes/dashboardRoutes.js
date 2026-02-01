const express = require('express');
const {
  getDashboardSummary,
  getExtendedDashboard,
  getDashboardStats,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/summary', getDashboardSummary);

router.get('/extended', getExtendedDashboard);

router.get('/stats', getDashboardStats);

router.get('/', getDashboardSummary);

module.exports = router;