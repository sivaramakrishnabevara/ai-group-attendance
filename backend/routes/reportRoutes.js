const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/attendance', authenticate, requireRole('ADMIN', 'TEACHER'), reportController.getAttendanceReport);
router.get('/low-attendance', authenticate, requireRole('ADMIN', 'TEACHER'), reportController.getLowAttendanceReport);
router.get('/export-csv', authenticate, requireRole('ADMIN', 'TEACHER'), reportController.exportAttendanceCSV);

module.exports = router;
