const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { uploadAttendance } = require('../middleware/uploadMiddleware');

router.get('/sessions', authenticate, attendanceController.getAllSessions);
router.post('/sessions', authenticate, requireRole('ADMIN', 'TEACHER'), attendanceController.createSession);
router.get('/sessions/:id', authenticate, attendanceController.getSessionDetails);

router.post(
  '/sessions/:sessionId/capture',
  authenticate,
  requireRole('ADMIN', 'TEACHER'),
  uploadAttendance.single('image'),
  attendanceController.captureAndRecognizeGroup
);

router.post(
  '/sessions/:sessionId/capture-group',
  authenticate,
  requireRole('ADMIN', 'TEACHER'),
  uploadAttendance.single('image'),
  attendanceController.captureAndRecognizeGroup
);

router.post(
  '/sessions/:id/capture-group',
  authenticate,
  requireRole('ADMIN', 'TEACHER'),
  uploadAttendance.single('image'),
  attendanceController.captureAndRecognizeGroup
);

router.put(
  '/sessions/:sessionId/records/:recordId',
  authenticate,
  requireRole('ADMIN', 'TEACHER'),
  attendanceController.updateAttendanceRecord
);

router.post(
  '/sessions/:id/submit',
  authenticate,
  requireRole('ADMIN', 'TEACHER'),
  attendanceController.submitSession
);

router.post(
  '/sessions/:sessionId/submit',
  authenticate,
  requireRole('ADMIN', 'TEACHER'),
  attendanceController.submitSession
);

router.post(
  '/sessions/:id/finalize',
  authenticate,
  requireRole('ADMIN'),
  attendanceController.finalizeSession
);

router.post(
  '/sessions/:sessionId/finalize',
  authenticate,
  requireRole('ADMIN'),
  attendanceController.finalizeSession
);

module.exports = router;
