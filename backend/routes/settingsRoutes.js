const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', authenticate, settingsController.getSettings);
router.put('/', authenticate, requireRole('ADMIN'), settingsController.updateSettings);

module.exports = router;
