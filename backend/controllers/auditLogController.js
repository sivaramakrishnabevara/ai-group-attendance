const db = require('../config/db');

async function getAuditLogs(req, res, next) {
  try {
    const { action, entityType, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.*,
        u.full_name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      query += ' AND a.action LIKE ?';
      params.push(`%${action}%`);
    }
    if (entityType) {
      query += ' AND a.entity_type = ?';
      params.push(entityType);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await db.query(query, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM audit_logs');

    res.json({
      success: true,
      data: rows,
      total: Number(total || 0),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs
};
