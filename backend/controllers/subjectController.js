const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');

async function getAllSubjects(req, res, next) {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT 
        s.id,
        s.subject_code,
        s.subject_name,
        s.description,
        s.is_active,
        s.created_at,
        GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') AS assigned_teachers
      FROM subjects s
      LEFT JOIN teacher_subjects ts ON s.id = ts.subject_id
      LEFT JOIN teachers t ON ts.teacher_id = t.id AND t.is_active = TRUE
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (s.subject_code LIKE ? OR s.subject_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (status !== undefined && status !== '') {
      query += ` AND s.is_active = ?`;
      params.push(status === 'true' || status === '1');
    }

    query += ` GROUP BY s.id ORDER BY s.subject_code ASC`;

    const [subjects] = await db.query(query, params);
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
}

async function getSubjectById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM subjects WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const [teachers] = await db.query(
      `SELECT t.id, t.employee_id, u.full_name, u.email, t.department
       FROM teacher_subjects ts
       JOIN teachers t ON ts.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE ts.subject_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        teachers
      }
    });
  } catch (err) {
    next(err);
  }
}

async function createSubject(req, res, next) {
  try {
    const { subjectCode, subjectName, description } = req.body;
    if (!subjectCode || !subjectName) {
      return res.status(400).json({ success: false, message: 'Subject code and Subject name are required.' });
    }

    const [exist] = await db.query('SELECT id FROM subjects WHERE subject_code = ?', [subjectCode.trim().toUpperCase()]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: 'A subject with this code already exists.' });
    }

    const [result] = await db.query(
      `INSERT INTO subjects (subject_code, subject_name, description, is_active, created_at)
       VALUES (?, ?, ?, TRUE, NOW())`,
      [subjectCode.trim().toUpperCase(), subjectName.trim(), description || null]
    );

    await logAudit({
      userId: req.user.id,
      action: 'SUBJECT_CREATED',
      entityType: 'SUBJECT',
      entityId: result.insertId,
      description: `Created subject ${subjectCode} - ${subjectName}`,
      req
    });

    res.status(201).json({ success: true, message: 'Subject created successfully.', subjectId: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function updateSubject(req, res, next) {
  try {
    const { id } = req.params;
    const { subjectCode, subjectName, description, isActive } = req.body;

    const [exist] = await db.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    await db.query(
      `UPDATE subjects
       SET subject_code = COALESCE(?, subject_code),
           subject_name = COALESCE(?, subject_name),
           description = COALESCE(?, description),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [subjectCode ? subjectCode.trim().toUpperCase() : null, subjectName, description, isActive, id]
    );

    await logAudit({
      userId: req.user.id,
      action: 'SUBJECT_UPDATED',
      entityType: 'SUBJECT',
      entityId: id,
      description: `Updated subject ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Subject updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function deactivateSubject(req, res, next) {
  try {
    const { id } = req.params;
    await db.query('UPDATE subjects SET is_active = FALSE WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      action: 'SUBJECT_DEACTIVATED',
      entityType: 'SUBJECT',
      entityId: id,
      description: `Deactivated subject ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Subject deactivated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deactivateSubject
};
