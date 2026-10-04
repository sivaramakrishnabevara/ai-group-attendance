const db = require('../config/db');

async function logAudit({
  userId = null,
  action,
  entityType = null,
  entityId = null,
  description = null,
  req = null
}) {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      userAgent = req.headers['user-agent'] || null;
      if (!userId && req.user) {
        userId = req.user.id;
      }
    }

    await db.query(
      `INSERT INTO audit_logs 
       (user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, entityType, entityId, description, ipAddress, userAgent]
    );
  } catch (err) {
    console.error('[AUDIT_LOG_ERROR]', err.message);
  }
}

module.exports = {
  logAudit
};
