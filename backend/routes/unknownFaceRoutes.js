const express = require('express');
const router = express.Router();
const unknownFaceController = require('../controllers/unknownFaceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', authenticate, requireRole('ADMIN', 'TEACHER'), unknownFaceController.getUnknownFaces);
router.post('/:id/assign', authenticate, requireRole('ADMIN', 'TEACHER'), unknownFaceController.assignUnknownFace);
router.post('/:id/ignore', authenticate, requireRole('ADMIN', 'TEACHER'), unknownFaceController.ignoreUnknownFace);
router.delete('/:id', authenticate, requireRole('ADMIN'), unknownFaceController.deleteUnknownFace);

module.exports = router;
