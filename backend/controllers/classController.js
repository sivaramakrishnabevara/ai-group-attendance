const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');

async function getAllClasses(req, res, next) {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT 
        c.id,
        c.class_name,
        c.section,
        c.academic_year,
        c.semester,
        c.is_active,
        c.created_at,
        COUNT(DISTINCT cs.student_id) AS student_count,
        GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') AS assigned_teachers
      FROM classes c
      LEFT JOIN class_students cs ON c.id = cs.class_id AND cs.is_active = TRUE
      LEFT JOIN teacher_classes tc ON c.id = tc.class_id
      LEFT JOIN teachers t ON tc.teacher_id = t.id AND t.is_active = TRUE
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (c.class_name LIKE ? OR c.section LIKE ? OR c.academic_year LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (status !== undefined && status !== '') {
      query += ` AND c.is_active = ?`;
      params.push(status === 'true' || status === '1');
    }

    query += ` GROUP BY c.id ORDER BY c.class_name ASC, c.section ASC`;

    const [classes] = await db.query(query, params);
    res.json({ success: true, data: classes });
  } catch (err) {
    next(err);
  }
}

async function getClassById(req, res, next) {
  try {
    const { id } = req.params;

    const [classes] = await db.query('SELECT * FROM classes WHERE id = ? LIMIT 1', [id]);
    if (classes.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }
    const classData = classes[0];

    // Enrolled students
    const [students] = await db.query(
      `SELECT s.id, s.student_id, s.roll_number, u.full_name, u.email, u.phone,
              COALESCE(fp.registration_status, 'PENDING') AS face_status,
              s.is_active
       FROM class_students cs
       JOIN students s ON cs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN student_face_profiles fp ON s.id = fp.student_id
       WHERE cs.class_id = ? AND cs.is_active = TRUE
       ORDER BY s.roll_number ASC, u.full_name ASC`,
      [id]
    );

    // Assigned teachers
    const [teachers] = await db.query(
      `SELECT t.id, t.employee_id, u.full_name, u.email, t.department, t.designation
       FROM teacher_classes tc
       JOIN teachers t ON tc.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE tc.class_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...classData,
        students,
        teachers
      }
    });
  } catch (err) {
    next(err);
  }
}

async function createClass(req, res, next) {
  try {
    const { className, section, academicYear, semester } = req.body;

    if (!className || !section || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Class Name, Section, and Academic Year are required.'
      });
    }

    const [exist] = await db.query(
      'SELECT id FROM classes WHERE class_name = ? AND section = ? AND academic_year = ?',
      [className.trim(), section.trim(), academicYear.trim()]
    );

    if (exist.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A class with this Name, Section, and Academic Year already exists.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO classes (class_name, section, academic_year, semester, is_active, created_at)
       VALUES (?, ?, ?, ?, TRUE, NOW())`,
      [className.trim(), section.trim(), academicYear.trim(), semester ? semester.trim() : null]
    );

    await logAudit({
      userId: req.user.id,
      action: 'CLASS_CREATED',
      entityType: 'CLASS',
      entityId: result.insertId,
      description: `Created class ${className} - Sec ${section} (${academicYear})`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Class created successfully.',
      classId: result.insertId
    });
  } catch (err) {
    next(err);
  }
}

async function updateClass(req, res, next) {
  try {
    const { id } = req.params;
    const { className, section, academicYear, semester, isActive } = req.body;

    const [exist] = await db.query('SELECT id FROM classes WHERE id = ?', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    await db.query(
      `UPDATE classes 
       SET class_name = COALESCE(?, class_name),
           section = COALESCE(?, section),
           academic_year = COALESCE(?, academic_year),
           semester = COALESCE(?, semester),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [className, section, academicYear, semester, isActive, id]
    );

    await logAudit({
      userId: req.user.id,
      action: 'CLASS_UPDATED',
      entityType: 'CLASS',
      entityId: id,
      description: `Updated class ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Class updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function deactivateClass(req, res, next) {
  try {
    const { id } = req.params;
    await db.query('UPDATE classes SET is_active = FALSE WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      action: 'CLASS_DEACTIVATED',
      entityType: 'CLASS',
      entityId: id,
      description: `Deactivated class ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Class deactivated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deactivateClass
};
