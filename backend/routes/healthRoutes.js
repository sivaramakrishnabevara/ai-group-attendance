const express = require('express');
const router = express.Router();
const db = require('../config/db');
const aiService = require('../services/aiService');

router.get('/health', async (req, res) => {
  let backendStatus = 'OK';
  let databaseStatus = 'OK';
  let aiServiceStatus = 'OK';

  // 1. Check MySQL
  try {
    const [rows] = await db.query('SELECT 1 AS alive');
    if (!rows || rows.length === 0) {
      databaseStatus = 'ERROR';
    }
  } catch (dbErr) {
    databaseStatus = 'ERROR: ' + dbErr.message;
  }

  // 2. Check Python FastAPI AI Service
  try {
    const aiHealth = await aiService.checkHealth();
    if (aiHealth.status !== 'OK') {
      aiServiceStatus = 'UNAVAILABLE';
    }
  } catch (aiErr) {
    aiServiceStatus = 'UNAVAILABLE';
  }

  const isHealthy = databaseStatus === 'OK' && aiServiceStatus === 'OK';

  res.status(isHealthy ? 200 : 207).json({
    backend: backendStatus,
    database: databaseStatus,
    ai_service: aiServiceStatus,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
