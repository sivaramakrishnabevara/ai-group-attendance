const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', authenticate, subjectController.getAllSubjects);
router.get('/:id', authenticate, subjectController.getSubjectById);
router.post('/', authenticate, requireRole('ADMIN'), subjectController.createSubject);
router.put('/:id', authenticate, requireRole('ADMIN'), subjectController.updateSubject);
router.delete('/:id', authenticate, requireRole('ADMIN'), subjectController.deactivateSubject);

module.exports = router;
