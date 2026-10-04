const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Teacher self-service (Allow TEACHER and ADMIN)
router.get('/dashboard', authenticate, requireRole('TEACHER', 'ADMIN'), teacherController.getTeacherDashboard);

// Support both /my-classes and /my/classes paths
router.get(['/my-classes', '/my/classes'], authenticate, requireRole('TEACHER', 'ADMIN'), teacherController.getMyClasses);

// Support both /my-subjects and /my/subjects paths
router.get(['/my-subjects', '/my/subjects'], authenticate, requireRole('TEACHER', 'ADMIN'), teacherController.getMySubjects);

// Support both /my-sessions and /my/sessions paths
router.get(['/my-sessions', '/my/sessions'], authenticate, requireRole('TEACHER', 'ADMIN'), teacherController.getMySessions);

// Admin teacher management
router.get('/', authenticate, requireRole('ADMIN'), teacherController.getAllTeachers);
router.get('/:id', authenticate, requireRole('ADMIN'), teacherController.getTeacherById);
router.post('/', authenticate, requireRole('ADMIN'), teacherController.createTeacher);
router.put('/:id', authenticate, requireRole('ADMIN'), teacherController.updateTeacher);
router.delete('/:id', authenticate, requireRole('ADMIN'), teacherController.deactivateTeacher);

module.exports = router;
