const db = require('../config/db');

async function getAttendanceReport(req, res, next) {
  try {
    const {
      dateFrom,
      dateTo,
      classId,
      subjectId,
      studentId,
      status,
      type = 'detailed'
    } = req.query;

    if (type === 'summary_by_student') {
      let query = `
        SELECT 
          s.id AS student_id,
          s.student_id AS student_code,
          s.roll_number,
          u.full_name,
          u.email,
          c.class_name,
          c.section,
          s.low_attendance_threshold,
          COUNT(ar.id) AS total_sessions,
          SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
          SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
          SUM(CASE WHEN ar.status = 'LATE' THEN 1 ELSE 0 END) AS late_count,
          SUM(CASE WHEN ar.status = 'EXCUSED' THEN 1 ELSE 0 END) AS excused_count,
          CASE 
            WHEN COUNT(ar.id) > 0 
            THEN ROUND((SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(ar.id)) * 100, 1)
            ELSE 100.0
          END AS attendance_percentage
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN attendance_records ar ON s.id = ar.student_id
        LEFT JOIN attendance_sessions ses ON ar.session_id = ses.id
        WHERE s.is_active = TRUE
      `;
      const params = [];

      if (classId) {
        query += ' AND s.class_id = ?';
        params.push(classId);
      }
      if (dateFrom) {
        query += ' AND (ses.session_date IS NULL OR ses.session_date >= ?)';
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ' AND (ses.session_date IS NULL OR ses.session_date <= ?)';
        params.push(dateTo);
      }
      if (subjectId) {
        query += ' AND (ses.subject_id IS NULL OR ses.subject_id = ?)';
        params.push(subjectId);
      }

      query += ' GROUP BY s.id ORDER BY attendance_percentage ASC, u.full_name ASC';

      const [rows] = await db.query(query, params);
      return res.json({ success: true, type: 'summary_by_student', data: rows });
    }

    // Default: Detailed attendance logs
    let query = `
      SELECT 
        ar.id,
        ses.session_date,
        c.class_name,
        c.section,
        sub.subject_code,
        sub.subject_name,
        teacher_user.full_name AS teacher_name,
        s.student_id AS student_code,
        s.roll_number,
        student_user.full_name AS student_name,
        student_user.email AS student_email,
        ar.status,
        ar.recognition_method,
        ar.similarity_score,
        ar.marked_at
      FROM attendance_records ar
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      JOIN classes c ON ses.class_id = c.id
      JOIN subjects sub ON ses.subject_id = sub.id
      JOIN teachers t ON ses.teacher_id = t.id
      JOIN users teacher_user ON t.user_id = teacher_user.id
      JOIN students s ON ar.student_id = s.id
      JOIN users student_user ON s.user_id = student_user.id
      WHERE 1=1
    `;
    const params = [];

    if (dateFrom) {
      query += ' AND ses.session_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND ses.session_date <= ?';
      params.push(dateTo);
    }
    if (classId) {
      query += ' AND ses.class_id = ?';
      params.push(classId);
    }
    if (subjectId) {
      query += ' AND ses.subject_id = ?';
      params.push(subjectId);
    }
    if (studentId) {
      query += ' AND ar.student_id = ?';
      params.push(studentId);
    }
    if (status) {
      query += ' AND ar.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ses.session_date DESC, ar.marked_at DESC LIMIT 1000';

    const [rows] = await db.query(query, params);
    res.json({ success: true, type: 'detailed', data: rows });
  } catch (err) {
    next(err);
  }
}

async function getLowAttendanceReport(req, res, next) {
  try {
    const { classId } = req.query;

    let query = `
      SELECT 
        s.id AS student_id,
        s.student_id AS student_code,
        s.roll_number,
        u.full_name,
        u.email,
        s.parent_name,
        s.parent_phone,
        s.parent_email,
        c.class_name,
        c.section,
        s.low_attendance_threshold,
        COUNT(ar.id) AS total_sessions,
        SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS attended_sessions,
        CASE 
          WHEN COUNT(ar.id) > 0 
          THEN ROUND((SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(ar.id)) * 100, 1)
          ELSE 0.0
        END AS attendance_rate
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance_records ar ON s.id = ar.student_id
      WHERE s.is_active = TRUE
    `;
    const params = [];

    if (classId) {
      query += ' AND s.class_id = ?';
      params.push(classId);
    }

    query += `
      GROUP BY s.id
      HAVING total_sessions > 0 AND attendance_rate < s.low_attendance_threshold
      ORDER BY attendance_rate ASC
    `;

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function exportAttendanceCSV(req, res, next) {
  try {
    const { dateFrom, dateTo, classId, subjectId, status } = req.query;

    let query = `
      SELECT 
        ses.session_date AS Date,
        c.class_name AS Class,
        c.section AS Section,
        sub.subject_code AS SubjectCode,
        sub.subject_name AS Subject,
        s.student_id AS StudentID,
        s.roll_number AS RollNo,
        student_user.full_name AS StudentName,
        ar.status AS Status,
        ar.recognition_method AS Method,
        COALESCE(ar.similarity_score, '') AS Similarity,
        ar.marked_at AS MarkedAt
      FROM attendance_records ar
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      JOIN classes c ON ses.class_id = c.id
      JOIN subjects sub ON ses.subject_id = sub.id
      JOIN students s ON ar.student_id = s.id
      JOIN users student_user ON s.user_id = student_user.id
      WHERE 1=1
    `;
    const params = [];

    if (dateFrom) {
      query += ' AND ses.session_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND ses.session_date <= ?';
      params.push(dateTo);
    }
    if (classId) {
      query += ' AND ses.class_id = ?';
      params.push(classId);
    }
    if (subjectId) {
      query += ' AND ses.subject_id = ?';
      params.push(subjectId);
    }
    if (status) {
      query += ' AND ar.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ses.session_date DESC, student_user.full_name ASC';

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).send('No attendance records found for specified criteria.');
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];

    for (const row of rows) {
      const line = headers.map(h => {
        let val = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
      csvLines.push(line);
    }

    const csvContent = csvLines.join('\r\n');
    const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAttendanceReport,
  getLowAttendanceReport,
  exportAttendanceCSV
};
