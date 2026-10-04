const db = require('../config/db');

async function createNotification({ userId, title, message, type = 'INFO' }) {
  try {
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      [userId, title, message, type]
    );
    return result.insertId;
  } catch (err) {
    console.error('[NOTIFICATION_SERVICE_ERROR]', err.message);
    return null;
  }
}

async function notifyAdmins({ title, message, type = 'SYSTEM' }) {
  try {
    const [admins] = await db.query(
      `SELECT id FROM users WHERE role = 'ADMIN' AND is_active = TRUE`
    );
    for (const admin of admins) {
      await createNotification({ userId: admin.id, title, message, type });
    }
  } catch (err) {
    console.error('[NOTIFY_ADMINS_ERROR]', err.message);
  }
}

module.exports = {
  createNotification,
  notifyAdmins
};
