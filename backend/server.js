const app = require('./app');
const db = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    logger.info(`MySQL database connected successfully. Test query: 1+1=${rows[0].result}`);

    app.listen(PORT, () => {
      logger.info(`AI Group Attendance Backend Server running on port ${PORT}`);
      logger.info(`API Base URL: http://localhost:${PORT}/api`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    logger.error('Failed to connect to MySQL database during startup:', err.message);
    process.exit(1);
  }
}

startServer();
