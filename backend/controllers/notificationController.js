const db = require('../config/db');

async function getMyNotifications(req, res, next) {
  try {
    const [notifications] = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );

    const [[{ unreadCount }]] = await db.query(
      `SELECT COUNT(*) AS unreadCount 
       FROM notifications 
       WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: notifications,
      unreadCount: Number(unreadCount || 0)
    });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
