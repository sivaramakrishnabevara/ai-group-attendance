const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', authenticate, classController.getAllClasses);
router.get('/:id', authenticate, classController.getClassById);
router.post('/', authenticate, requireRole('ADMIN'), classController.createClass);
router.put('/:id', authenticate, requireRole('ADMIN'), classController.updateClass);
router.delete('/:id', authenticate, requireRole('ADMIN'), classController.deactivateClass);

module.exports = router;
