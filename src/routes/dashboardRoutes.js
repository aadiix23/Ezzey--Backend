const express = require('express');
const {
  getDashboardSummary,
  getExtendedDashboard,
  getDashboardStats,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

// Basic dashboard summary
router.get('/summary', getDashboardSummary);

// Extended dashboard with detailed breakdown
router.get('/extended', getExtendedDashboard);

// Quick stats for widgets
router.get('/stats', getDashboardStats);

// Alias for main dashboard endpoint (without /dashboard prefix when mounted)
router.get('/', getDashboardSummary);

module.exports = router;