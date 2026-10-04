const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { uploadStudentFace } = require('../middleware/uploadMiddleware');

// Student self-service
router.get('/dashboard', authenticate, requireRole('STUDENT'), studentController.getStudentDashboard);

// Face registration endpoints (accessible to the student themselves or an admin)
router.post(
  '/:id/register-face',
  authenticate,
  requireRole('ADMIN', 'STUDENT'),
  uploadStudentFace.single('image'),
  studentController.registerFaceStep
);

router.get(
  '/:id/face-status',
  authenticate,
  requireRole('ADMIN', 'STUDENT', 'TEACHER'),
  studentController.getFaceRegistrationStatus
);

// Admin student management
router.get('/', authenticate, requireRole('ADMIN', 'TEACHER'), studentController.getAllStudents);
router.get('/:id', authenticate, requireRole('ADMIN', 'TEACHER', 'STUDENT'), studentController.getStudentById);
router.post('/', authenticate, requireRole('ADMIN'), studentController.createStudent);
router.put('/:id', authenticate, requireRole('ADMIN'), studentController.updateStudent);
router.delete('/:id', authenticate, requireRole('ADMIN'), studentController.deactivateStudent);

module.exports = router;
