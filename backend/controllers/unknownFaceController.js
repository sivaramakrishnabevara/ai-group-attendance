const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');

async function getUnknownFaces(req, res, next) {
  try {
    const { sessionId, status } = req.query;

    let query = `
      SELECT 
        uf.id,
        uf.session_id,
        uf.image_path,
        uf.face_box_json,
        uf.similarity_score,
        uf.status,
        uf.assigned_student_id,
        uf.reviewed_by,
        uf.reviewed_at,
        uf.notes,
        uf.created_at,
        s.student_id AS assigned_student_code,
        u.full_name AS assigned_student_name,
        rev.full_name AS reviewer_name,
        ses.session_date,
        c.class_name,
        c.section,
        sub.subject_code,
        sub.subject_name
      FROM unknown_faces uf
      JOIN attendance_sessions ses ON uf.session_id = ses.id
      JOIN classes c ON ses.class_id = c.id
      JOIN subjects sub ON ses.subject_id = sub.id
      LEFT JOIN students s ON uf.assigned_student_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN users rev ON uf.reviewed_by = rev.id
      WHERE 1=1
    `;

    const params = [];

    if (sessionId) {
      query += ' AND uf.session_id = ?';
      params.push(sessionId);
    }

    if (status) {
      query += ' AND uf.status = ?';
      params.push(status);
    }

    query += ' ORDER BY uf.id DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function assignUnknownFace(req, res, next) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { studentId, notes } = req.body;

    if (!studentId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Target student ID is required.' });
    }

    const [unknowns] = await connection.query(
      'SELECT id, session_id, status FROM unknown_faces WHERE id = ? LIMIT 1',
      [id]
    );

    if (unknowns.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Unknown face record not found.' });
    }

    const unknown = unknowns[0];

    // Check target student exists
    const [students] = await connection.query(
      `SELECT s.id, u.full_name, s.student_id 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ? LIMIT 1`,
      [studentId]
    );

    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Selected student not found.' });
    }

    // 1. Update unknown face status
    await connection.query(
      `UPDATE unknown_faces 
       SET status = 'ASSIGNED',
           assigned_student_id = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           notes = ?
       WHERE id = ?`,
      [studentId, req.user.id, notes || 'Manually assigned by reviewer', id]
    );

    // 2. Upsert attendance record for this student in this session (PREVENTS DUPLICATES)
    await connection.query(
      `INSERT INTO attendance_records 
       (session_id, student_id, status, recognition_method, marked_at)
       VALUES (?, ?, 'PRESENT', 'MANUAL', NOW())
       ON DUPLICATE KEY UPDATE
         status = 'PRESENT',
         recognition_method = 'MANUAL',
         updated_at = NOW()`,
      [unknown.session_id, studentId]
    );

    // 3. Update session aggregate counters
    const [[counts]] = await connection.query(
      `SELECT 
         SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS total_present,
         SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS total_absent
       FROM attendance_records
       WHERE session_id = ?`,
      [unknown.session_id]
    );

    const [[uCount]] = await connection.query(
      `SELECT COUNT(*) AS total_unknown FROM unknown_faces WHERE session_id = ? AND status = 'PENDING'`,
      [unknown.session_id]
    );

    await connection.query(
      `UPDATE attendance_sessions 
       SET total_present = ?, total_absent = ?, total_unknown = ?
       WHERE id = ?`,
      [Number(counts.total_present || 0), Number(counts.total_absent || 0), Number(uCount.total_unknown || 0), unknown.session_id]
    );

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      action: 'UNKNOWN_FACE_ASSIGNED',
      entityType: 'UNKNOWN_FACE',
      entityId: id,
      description: `Assigned unknown face ID ${id} to student ${students[0].full_name} (${students[0].student_id})`,
      req
    });

    res.json({
      success: true,
      message: `Unknown face successfully assigned to ${students[0].full_name}. Attendance marked PRESENT.`
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function ignoreUnknownFace(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await db.query(
      `UPDATE unknown_faces 
       SET status = 'IGNORED',
           reviewed_by = ?,
           reviewed_at = NOW(),
           notes = ?
       WHERE id = ?`,
      [req.user.id, notes || 'Ignored by reviewer', id]
    );

    await logAudit({
      userId: req.user.id,
      action: 'UNKNOWN_FACE_IGNORED',
      entityType: 'UNKNOWN_FACE',
      entityId: id,
      description: `Ignored unknown face ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Unknown face marked as ignored.' });
  } catch (err) {
    next(err);
  }
}

async function deleteUnknownFace(req, res, next) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM unknown_faces WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      action: 'UNKNOWN_FACE_DELETED',
      entityType: 'UNKNOWN_FACE',
      entityId: id,
      description: `Deleted unknown face ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Unknown face record deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUnknownFaces,
  assignUnknownFace,
  ignoreUnknownFace,
  deleteUnknownFace
};
