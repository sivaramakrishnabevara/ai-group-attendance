const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');

async function getAllTeachers(req, res, next) {
  try {
    const { search, department, status } = req.query;

    let query = `
      SELECT 
        t.id,
        t.user_id,
        t.employee_id,
        t.department,
        t.designation,
        t.is_active,
        t.created_at,
        u.full_name,
        u.email,
        u.phone,
        u.profile_image,
        GROUP_CONCAT(DISTINCT CONCAT(c.class_name, ' (', c.section, ')') SEPARATOR ', ') AS assigned_classes,
        GROUP_CONCAT(DISTINCT sub.subject_code SEPARATOR ', ') AS assigned_subjects
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN teacher_classes tc ON t.id = tc.teacher_id
      LEFT JOIN classes c ON tc.class_id = c.id
      LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
      LEFT JOIN subjects sub ON ts.subject_id = sub.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR t.employee_id LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (department) {
      query += ` AND t.department = ?`;
      params.push(department);
    }

    if (status !== undefined && status !== '') {
      query += ` AND t.is_active = ?`;
      params.push(status === 'true' || status === '1');
    }

    query += ` GROUP BY t.id ORDER BY t.id DESC`;

    const [teachers] = await db.query(query, params);
    res.json({ success: true, data: teachers });
  } catch (err) {
    next(err);
  }
}

async function getTeacherById(req, res, next) {
  try {
    const { id } = req.params;

    const [teachers] = await db.query(
      `SELECT 
         t.*,
         u.full_name,
         u.email,
         u.phone,
         u.profile_image
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ? LIMIT 1`,
      [id]
    );

    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher record not found.' });
    }

    const teacher = teachers[0];

    // Assigned classes
    const [assignedClasses] = await db.query(
      `SELECT c.id, c.class_name, c.section, c.academic_year 
       FROM teacher_classes tc
       JOIN classes c ON tc.class_id = c.id
       WHERE tc.teacher_id = ?`,
      [id]
    );

    // Assigned subjects
    const [assignedSubjects] = await db.query(
      `SELECT s.id, s.subject_code, s.subject_name 
       FROM teacher_subjects ts
       JOIN subjects s ON ts.subject_id = s.id
       WHERE ts.teacher_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...teacher,
        classes: assignedClasses,
        subjects: assignedSubjects
      }
    });
  } catch (err) {
    next(err);
  }
}

async function createTeacher(req, res, next) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      fullName,
      email,
      phone,
      password,
      employeeId,
      department,
      designation,
      classIds = [],
      subjectIds = []
    } = req.body;

    if (!fullName || !email || !employeeId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Full Name, Email, and Employee ID are required.'
      });
    }

    // Check unique email
    const [existEmail] = await connection.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existEmail.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    // Check unique employeeId
    const [existEmp] = await connection.query('SELECT id FROM teachers WHERE employee_id = ?', [employeeId.trim()]);
    if (existEmp.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'A teacher with this Employee ID already exists.' });
    }

    const initialPassword = password || employeeId.trim();
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    // 1. Create user
    const [userRes] = await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'TEACHER', TRUE, NOW())`,
      [fullName.trim(), email.trim().toLowerCase(), phone || null, passwordHash]
    );
    const userId = userRes.insertId;

    // 2. Create teacher profile
    const [teacherRes] = await connection.query(
      `INSERT INTO teachers (user_id, employee_id, department, designation, is_active, created_at)
       VALUES (?, ?, ?, ?, TRUE, NOW())`,
      [userId, employeeId.trim(), department || null, designation || null]
    );
    const newTeacherId = teacherRes.insertId;

    // 3. Assign classes
    for (const cId of classIds) {
      await connection.query(
        `INSERT IGNORE INTO teacher_classes (teacher_id, class_id, created_at)
         VALUES (?, ?, NOW())`,
        [newTeacherId, cId]
      );
    }

    // 4. Assign subjects
    for (const sId of subjectIds) {
      await connection.query(
        `INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id, created_at)
         VALUES (?, ?, NOW())`,
        [newTeacherId, sId]
      );
    }

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      action: 'TEACHER_CREATED',
      entityType: 'TEACHER',
      entityId: newTeacherId,
      description: `Created teacher ${fullName} (${employeeId})`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Teacher created and assigned successfully.',
      teacherId: newTeacherId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function updateTeacher(req, res, next) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      fullName,
      phone,
      department,
      designation,
      isActive,
      classIds,
      subjectIds
    } = req.body;

    const [teachers] = await connection.query('SELECT user_id FROM teachers WHERE id = ?', [id]);
    if (teachers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Teacher record not found.' });
    }
    const userId = teachers[0].user_id;

    if (fullName !== undefined || phone !== undefined || isActive !== undefined) {
      await connection.query(
        `UPDATE users 
         SET full_name = COALESCE(?, full_name),
             phone = COALESCE(?, phone),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [fullName, phone, isActive, userId]
      );
    }

    await connection.query(
      `UPDATE teachers
       SET department = COALESCE(?, department),
           designation = COALESCE(?, designation),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [department, designation, isActive, id]
    );

    // Update class assignments if provided
    if (Array.isArray(classIds)) {
      await connection.query('DELETE FROM teacher_classes WHERE teacher_id = ?', [id]);
      for (const cId of classIds) {
        await connection.query(
          'INSERT INTO teacher_classes (teacher_id, class_id, created_at) VALUES (?, ?, NOW())',
          [id, cId]
        );
      }
    }

    // Update subject assignments if provided
    if (Array.isArray(subjectIds)) {
      await connection.query('DELETE FROM teacher_subjects WHERE teacher_id = ?', [id]);
      for (const sId of subjectIds) {
        await connection.query(
          'INSERT INTO teacher_subjects (teacher_id, subject_id, created_at) VALUES (?, ?, NOW())',
          [id, sId]
        );
      }
    }

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      action: 'TEACHER_UPDATED',
      entityType: 'TEACHER',
      entityId: id,
      description: `Updated teacher record ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Teacher updated successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function deactivateTeacher(req, res, next) {
  try {
    const { id } = req.params;
    const [teachers] = await db.query('SELECT user_id FROM teachers WHERE id = ?', [id]);
    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    await db.query('UPDATE teachers SET is_active = FALSE WHERE id = ?', [id]);
    await db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [teachers[0].user_id]);

    await logAudit({
      userId: req.user.id,
      action: 'TEACHER_DEACTIVATED',
      entityType: 'TEACHER',
      entityId: id,
      description: `Deactivated teacher ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Teacher deactivated successfully.' });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// TEACHER DASHBOARD & WORKFLOW
// -------------------------------------------------------------

async function getTeacherDashboard(req, res, next) {
  try {
    const [tRows] = await db.query('SELECT id, employee_id, department, designation FROM teachers WHERE user_id = ?', [req.user.id]);
    if (tRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }
    const teacherId = tRows[0].id;

    // Assigned Classes
    const [assignedClasses] = await db.query(
      `SELECT c.id, c.class_name, c.section, c.academic_year,
              COUNT(DISTINCT cs.student_id) AS student_count
       FROM teacher_classes tc
       JOIN classes c ON tc.class_id = c.id
       LEFT JOIN class_students cs ON c.id = cs.class_id AND cs.is_active = TRUE
       WHERE tc.teacher_id = ? AND c.is_active = TRUE
       GROUP BY c.id`,
      [teacherId]
    );

    // Assigned Subjects
    const [assignedSubjects] = await db.query(
      `SELECT s.id, s.subject_code, s.subject_name 
       FROM teacher_subjects ts
       JOIN subjects s ON ts.subject_id = s.id
       WHERE ts.teacher_id = ? AND s.is_active = TRUE`,
      [teacherId]
    );

    // Today's attendance sessions for this teacher
    const [todaySessions] = await db.query(
      `SELECT 
         ses.id,
         ses.session_date,
         ses.status,
         ses.total_students,
         ses.total_present,
         ses.total_absent,
         ses.total_unknown,
         c.class_name,
         c.section,
         sub.subject_code,
         sub.subject_name
       FROM attendance_sessions ses
       JOIN classes c ON ses.class_id = c.id
       JOIN subjects sub ON ses.subject_id = sub.id
       WHERE ses.teacher_id = ? AND ses.session_date = CURDATE()
       ORDER BY ses.id DESC`,
      [teacherId]
    );

    // Cumulative stats
    const [[allStats]] = await db.query(
      `SELECT 
         COUNT(*) AS total_sessions,
         COALESCE(SUM(total_present), 0) AS total_present,
         COALESCE(SUM(total_absent), 0) AS total_absent,
         COALESCE(SUM(total_students), 0) AS total_enrolled,
         SUM(CASE WHEN status = 'OPEN' OR status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_sessions
       FROM attendance_sessions
       WHERE teacher_id = ?`,
      [teacherId]
    );

    const enrolled = Number(allStats.total_enrolled || 0);
    const present = Number(allStats.total_present || 0);
    const presentPercentage = enrolled > 0 ? Number(((present / enrolled) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        teacher: tRows[0],
        assignedClasses,
        assignedSubjects,
        todaySessions,
        stats: {
          totalSessions: Number(allStats.total_sessions || 0),
          totalPresent: present,
          totalAbsent: Number(allStats.total_absent || 0),
          presentPercentage,
          pendingSessions: Number(allStats.pending_sessions || 0)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getMyClasses(req, res, next) {
  try {
    let teacherId = null;
    const [tRows] = await db.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (tRows.length > 0) {
      teacherId = tRows[0].id;
    }

    let classes = [];
    if (teacherId) {
      const [assigned] = await db.query(
        `SELECT c.id, c.class_name, c.section, c.academic_year, c.semester,
                COUNT(DISTINCT cs.student_id) AS student_count
         FROM teacher_classes tc
         JOIN classes c ON tc.class_id = c.id
         LEFT JOIN class_students cs ON c.id = cs.class_id AND cs.is_active = TRUE
         WHERE tc.teacher_id = ? AND c.is_active = TRUE
         GROUP BY c.id
         ORDER BY c.class_name ASC`,
        [teacherId]
      );
      classes = assigned;
    }

    // Fallback if admin or if no specific classes assigned yet
    if (classes.length === 0) {
      const [allClasses] = await db.query(
        `SELECT c.id, c.class_name, c.section, c.academic_year, c.semester,
                COUNT(DISTINCT cs.student_id) AS student_count
         FROM classes c
         LEFT JOIN class_students cs ON c.id = cs.class_id AND cs.is_active = TRUE
         WHERE c.is_active = TRUE
         GROUP BY c.id
         ORDER BY c.class_name ASC`
      );
      classes = allClasses;
    }

    res.json({ success: true, data: classes });
  } catch (err) {
    next(err);
  }
}

async function getMySubjects(req, res, next) {
  try {
    let teacherId = null;
    const [tRows] = await db.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (tRows.length > 0) {
      teacherId = tRows[0].id;
    }

    let subjects = [];
    if (teacherId) {
      const [assigned] = await db.query(
        `SELECT s.id, s.subject_code, s.subject_name, s.description
         FROM teacher_subjects ts
         JOIN subjects s ON ts.subject_id = s.id
         WHERE ts.teacher_id = ? AND s.is_active = TRUE
         ORDER BY s.subject_code ASC`,
        [teacherId]
      );
      subjects = assigned;
    }

    // Fallback if admin or if no specific subjects assigned yet
    if (subjects.length === 0) {
      const [allSubjects] = await db.query(
        `SELECT s.id, s.subject_code, s.subject_name, s.description
         FROM subjects s
         WHERE s.is_active = TRUE
         ORDER BY s.subject_code ASC`
      );
      subjects = allSubjects;
    }

    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
}

async function getMySessions(req, res, next) {
  try {
    let teacherId = null;
    const [tRows] = await db.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (tRows.length > 0) {
      teacherId = tRows[0].id;
    }

    let query = `
      SELECT 
        ses.id,
        ses.session_date,
        ses.start_time,
        ses.end_time,
        ses.status,
        ses.capture_image,
        ses.total_students,
        ses.total_present,
        ses.total_absent,
        ses.total_unknown,
        c.class_name,
        c.section,
        sub.subject_code,
        sub.subject_name
      FROM attendance_sessions ses
      JOIN classes c ON ses.class_id = c.id
      JOIN subjects sub ON ses.subject_id = sub.id
    `;
    const params = [];

    if (teacherId) {
      query += ` WHERE ses.teacher_id = ?`;
      params.push(teacherId);
    }

    query += ` ORDER BY ses.id DESC LIMIT 50`;

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deactivateTeacher,
  getTeacherDashboard,
  getMyClasses,
  getMySubjects,
  getMySessions
};

