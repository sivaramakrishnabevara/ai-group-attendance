const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const aiService = require('../services/aiService');
const { logAudit } = require('../middleware/auditMiddleware');
const { createNotification, notifyAdmins } = require('../services/notificationService');
const { sendAbsenceNotificationEmail } = require('../services/emailService');

async function createSession(req, res, next) {
  try {
    const { classId, subjectId, sessionDate, startTime } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID and Subject ID are required to initiate an attendance session.'
      });
    }

    // Determine teacher ID
    let teacherId = null;
    if (req.user.role === 'TEACHER') {
      const [tRows] = await db.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (tRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Teacher profile not found for user.' });
      }
      teacherId = tRows[0].id;
    } else if (req.body.teacherId) {
      teacherId = req.body.teacherId;
    } else {
      // Find first teacher assigned to this subject/class or system default
      const [tRows] = await db.query(
        `SELECT teacher_id FROM teacher_classes WHERE class_id = ? LIMIT 1`,
        [classId]
      );
      teacherId = tRows.length > 0 ? tRows[0].teacher_id : 1;
    }

    // Fetch all active students in this class
    const [classStudents] = await db.query(
      `SELECT s.id AS student_table_id, s.student_id, s.roll_number, u.full_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE (s.class_id = ? OR s.id IN (SELECT student_id FROM class_students WHERE class_id = ? AND is_active = TRUE))
         AND s.is_active = TRUE AND u.is_active = TRUE
       ORDER BY s.roll_number ASC, u.full_name ASC`,
      [classId, classId]
    );

    const totalStudents = classStudents.length;
    const targetDate = sessionDate || new Date().toISOString().split('T')[0];

    const [result] = await db.query(
      `INSERT INTO attendance_sessions 
       (class_id, subject_id, teacher_id, session_date, start_time, status, total_students, total_present, total_absent, created_at)
       VALUES (?, ?, ?, ?, ?, 'OPEN', ?, 0, ?, NOW())`,
      [classId, subjectId, teacherId, targetDate, startTime || new Date(), totalStudents, totalStudents]
    );

    const sessionId = result.insertId;

    // Seed initial records as ABSENT
    for (const stu of classStudents) {
      await db.query(
        `INSERT INTO attendance_records 
         (session_id, student_id, status, recognition_method, marked_at)
         VALUES (?, ?, 'ABSENT', 'MANUAL', NOW())
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [sessionId, stu.student_table_id]
      );
    }

    const [records] = await db.query(
      `SELECT 
         ar.id,
         ar.session_id,
         ar.student_id,
         ar.status,
         ar.recognition_method,
         ar.similarity_score,
         ar.confidence_score,
         ar.face_box_json,
         ar.marked_at,
         ar.updated_at,
         s.student_id AS student_code,
         s.roll_number,
         u.full_name AS student_name,
         u.email AS student_email,
         u.profile_image
       FROM attendance_records ar
       JOIN students s ON ar.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ar.session_id = ?
       ORDER BY ar.status ASC, s.roll_number ASC, u.full_name ASC`,
      [sessionId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'ATTENDANCE_SESSION_CREATED',
      entityType: 'ATTENDANCE_SESSION',
      entityId: sessionId,
      description: `Created attendance session ID ${sessionId} for class ${classId}`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Attendance session opened successfully.',
      session: {
        id: sessionId,
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId,
        session_date: targetDate,
        status: 'OPEN',
        total_students: totalStudents,
        total_present: 0,
        total_absent: totalStudents
      },
      records,
      summary: {
        total_students: totalStudents,
        present_count: 0,
        absent_count: totalStudents,
        unknown_count: 0
      }
    });
  } catch (err) {
    next(err);
  }
}

async function captureAndRecognizeGroup(req, res, next) {
  const connection = await db.getConnection();
  try {
    const sessionId = req.params.sessionId || req.params.id;
    const threshold = req.body.threshold ? parseFloat(req.body.threshold) : null;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Classroom capture image is required.' });
    }

    const captureFilePath = req.file.path;
    const relCapturePath = `/uploads/attendance/${path.basename(captureFilePath)}`;

    // Verify session
    const [sessions] = await connection.query(
      `SELECT s.*, c.class_name, c.section, sub.subject_name 
       FROM attendance_sessions s
       JOIN classes c ON s.class_id = c.id
       JOIN subjects sub ON s.subject_id = sub.id
       WHERE s.id = ? LIMIT 1`,
      [sessionId]
    );

    if (sessions.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    const session = sessions[0];
    if (session.status === 'FINALIZED') {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'This session has already been finalized and locked.'
      });
    }

    // Fetch all active enrolled students in this class
    const [enrolledStudents] = await connection.query(
      `SELECT 
         s.id AS student_table_id,
         s.student_id,
         s.roll_number,
         u.full_name,
         u.email,
         s.parent_name,
         s.parent_email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE (s.class_id = ? OR s.id IN (SELECT student_id FROM class_students WHERE class_id = ? AND is_active = TRUE))
         AND s.is_active = TRUE AND u.is_active = TRUE
       ORDER BY s.roll_number ASC, u.full_name ASC`,
      [session.class_id, session.class_id]
    );

    // Fetch all enrolled face embeddings for these students
    const studentTableIds = enrolledStudents.map(s => s.student_table_id);
    let embeddingsMap = {};

    if (studentTableIds.length > 0) {
      const [embRows] = await connection.query(
        `SELECT student_id, embedding_json 
         FROM face_embeddings 
         WHERE student_id IN (?)`,
        [studentTableIds]
      );

      for (const row of embRows) {
        if (!embeddingsMap[row.student_id]) {
          embeddingsMap[row.student_id] = [];
        }
        try {
          const parsed = JSON.parse(row.embedding_json);
          embeddingsMap[row.student_id].push(parsed);
        } catch (e) {
          // ignore invalid json
        }
      }
    }

    // Format candidate students for AI service
    const aiCandidates = enrolledStudents.map(s => ({
      student_id: String(s.student_table_id),
      student_name: s.full_name,
      embeddings: embeddingsMap[s.student_table_id] || []
    }));

    // Call Python AI Service /recognize-group (YuNet + SFace + Cosine Similarity)
    let aiResponse;
    try {
      aiResponse = await aiService.recognizeGroup(captureFilePath, aiCandidates, threshold);
    } catch (aiErr) {
      connection.release();
      return res.status(502).json({
        success: false,
        message: `AI Recognition service failed: ${aiErr.message}`
      });
    }

    await connection.beginTransaction();

    // Update session capture image
    await connection.query(
      `UPDATE attendance_sessions SET capture_image = ? WHERE id = ?`,
      [relCapturePath, sessionId]
    );

    const recognizedList = aiResponse.recognized || [];
    const unknownList = aiResponse.unknown || [];

    const recognizedStudentTableIds = new Set();
    const studentMetaMap = {};
    for (const r of recognizedList) {
      if (r.status === 'recognized') {
        const sId = parseInt(r.student_id, 10);
        recognizedStudentTableIds.add(sId);
        studentMetaMap[sId] = r;
      }
    }

    // Upsert attendance records for all enrolled students
    let presentCount = 0;
    let absentCount = 0;

    for (const s of enrolledStudents) {
      const isRecognized = recognizedStudentTableIds.has(s.student_table_id);
      const meta = studentMetaMap[s.student_table_id];

      const status = isRecognized ? 'PRESENT' : 'ABSENT';
      const method = isRecognized ? 'AI' : 'AI';
      const simScore = isRecognized && meta ? meta.similarity : null;
      const confScore = isRecognized && meta ? meta.confidence : null;
      const faceBox = isRecognized && meta ? JSON.stringify(meta.box) : null;

      if (isRecognized) {
        presentCount++;
      } else {
        absentCount++;
      }

      await connection.query(
        `INSERT INTO attendance_records 
         (session_id, student_id, status, recognition_method, similarity_score, confidence_score, face_box_json, marked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           recognition_method = VALUES(recognition_method),
           similarity_score = VALUES(similarity_score),
           confidence_score = VALUES(confidence_score),
           face_box_json = VALUES(face_box_json),
           updated_at = NOW()`,
        [sessionId, s.student_table_id, status, method, simScore, confScore, faceBox]
      );
    }

    // Clear previous unknown faces for this session if re-capturing
    await connection.query('DELETE FROM unknown_faces WHERE session_id = ?', [sessionId]);

    // Insert detected unknown faces
    for (const u of unknownList) {
      let savedCropPath = relCapturePath;
      if (u.face_crop && u.face_crop.startsWith('data:image')) {
        try {
          const base64Data = u.face_crop.replace(/^data:image\/\w+;base64,/, '');
          const cropFilename = `unknown_${sessionId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
          const cropDiskPath = path.join(__dirname, '..', 'uploads', 'unknown-faces', cropFilename);
          fs.writeFileSync(cropDiskPath, Buffer.from(base64Data, 'base64'));
          savedCropPath = `/uploads/unknown-faces/${cropFilename}`;
        } catch (saveErr) {
          console.error('Failed to write unknown face crop file:', saveErr.message);
        }
      }

      await connection.query(
        `INSERT INTO unknown_faces 
         (session_id, image_path, face_box_json, embedding_json, similarity_score, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'PENDING', NOW())`,
        [
          sessionId,
          savedCropPath,
          JSON.stringify(u.box),
          u.embedding ? JSON.stringify(u.embedding) : null,
          u.similarity || 0.0
        ]
      );
    }

    // Update attendance_sessions counters
    const unknownCount = unknownList.length;
    await connection.query(
      `UPDATE attendance_sessions 
       SET total_students = ?,
           total_present = ?,
           total_absent = ?,
           total_unknown = ?
       WHERE id = ?`,
      [enrolledStudents.length, presentCount, absentCount, unknownCount, sessionId]
    );

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      action: 'GROUP_FACE_RECOGNITION',
      entityType: 'ATTENDANCE_SESSION',
      entityId: sessionId,
      description: `Executed AI group recognition: ${presentCount} recognized, ${absentCount} absent, ${unknownCount} unknown`,
      req
    });

    const [records] = await connection.query(
      `SELECT 
         ar.id,
         ar.session_id,
         ar.student_id,
         ar.status,
         ar.recognition_method,
         ar.similarity_score,
         ar.confidence_score,
         ar.face_box_json,
         ar.marked_at,
         ar.updated_at,
         s.student_id AS student_code,
         s.roll_number,
         s.parent_name,
         s.parent_phone,
         s.parent_email,
         u.full_name AS student_name,
         u.email AS student_email,
         u.profile_image
       FROM attendance_records ar
       JOIN students s ON ar.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ar.session_id = ?
       ORDER BY ar.status ASC, s.roll_number ASC, u.full_name ASC`,
      [sessionId]
    );

    res.json({
      success: true,
      message: 'AI recognition completed successfully.',
      data: {
        sessionId: Number(sessionId),
        totalEnrolled: enrolledStudents.length,
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalUnknown: unknownCount,
        thresholdUsed: aiResponse.threshold_used,
        recognized: recognizedList,
        unknown: unknownList,
        captureImage: relCapturePath,
        records,
        summary: {
          total_students: enrolledStudents.length,
          present_count: presentCount,
          absent_count: absentCount,
          unknown_count: unknownCount
        }
      }
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function getSessionDetails(req, res, next) {
  try {
    const id = req.params.id || req.params.sessionId;

    const [sessions] = await db.query(
      `SELECT 
         s.*,
         c.class_name,
         c.section,
         c.academic_year,
         sub.subject_code,
         sub.subject_name,
         u.full_name AS teacher_name,
         u.email AS teacher_email
       FROM attendance_sessions s
       JOIN classes c ON s.class_id = c.id
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN teachers t ON s.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE s.id = ? LIMIT 1`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    const session = sessions[0];

    // If session is OPEN, ensure all active students have an attendance record (default ABSENT)
    if (session.status === 'OPEN') {
      const [classStudents] = await db.query(
        `SELECT s.id AS student_table_id
         FROM students s
         WHERE (s.class_id = ? OR s.id IN (SELECT student_id FROM class_students WHERE class_id = ? AND is_active = TRUE))
           AND s.is_active = TRUE`,
        [session.class_id, session.class_id]
      );

      for (const cs of classStudents) {
        await db.query(
          `INSERT IGNORE INTO attendance_records 
           (session_id, student_id, status, recognition_method, similarity_score, marked_at)
           VALUES (?, ?, 'ABSENT', 'SYSTEM', 0.0, NOW())`,
          [id, cs.student_table_id]
        );
      }
    }

    // Attendance records with student info
    const [records] = await db.query(
      `SELECT 
         ar.id,
         ar.session_id,
         ar.student_id,
         ar.status,
         ar.recognition_method,
         ar.similarity_score,
         ar.confidence_score,
         ar.face_box_json,
         ar.marked_at,
         ar.updated_at,
         s.student_id AS student_code,
         s.roll_number,
         s.parent_name,
         s.parent_phone,
         s.parent_email,
         u.full_name AS student_name,
         u.email AS student_email,
         u.profile_image
       FROM attendance_records ar
       JOIN students s ON ar.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ar.session_id = ?
       ORDER BY ar.status ASC, s.roll_number ASC, u.full_name ASC`,
      [id]
    );

    // Unknown faces detected in this session
    const [unknowns] = await db.query(
      `SELECT 
         uf.*,
         s.student_id AS assigned_student_code,
         u.full_name AS assigned_student_name,
         rev.full_name AS reviewer_name
       FROM unknown_faces uf
       LEFT JOIN students s ON uf.assigned_student_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN users rev ON uf.reviewed_by = rev.id
       WHERE uf.session_id = ?
       ORDER BY uf.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        session,
        records,
        unknownFaces: unknowns
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateAttendanceRecord(req, res, next) {
  try {
    const { sessionId, recordId } = req.params;
    const { status, recognitionMethod } = req.body;

    const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [records] = await db.query(
      `SELECT ar.*, ses.status AS session_status 
       FROM attendance_records ar
       JOIN attendance_sessions ses ON ar.session_id = ses.id
       WHERE (ar.id = ? OR ar.student_id = ?) AND ar.session_id = ? LIMIT 1`,
      [recordId, recordId, sessionId]
    );

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    if (records[0].session_status === 'FINALIZED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'This session has been finalized. Only administrators can amend finalized records.'
      });
    }

    const actualRecordId = records[0].id;
    await db.query(
      `UPDATE attendance_records 
       SET status = ?, 
           recognition_method = COALESCE(?, 'MANUAL'),
           updated_at = NOW()
       WHERE id = ?`,
      [status, recognitionMethod, actualRecordId]
    );

    // Recalculate session counters
    const [[counts]] = await db.query(
      `SELECT 
         COUNT(*) AS total_students,
         SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS total_present,
         SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS total_absent
       FROM attendance_records
       WHERE session_id = ?`,
      [sessionId]
    );

    await db.query(
      `UPDATE attendance_sessions 
       SET total_present = ?, total_absent = ?
       WHERE id = ?`,
      [Number(counts.total_present || 0), Number(counts.total_absent || 0), sessionId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'ATTENDANCE_RECORD_CORRECTED',
      entityType: 'ATTENDANCE_RECORD',
      entityId: recordId,
      description: `Corrected attendance record ID ${recordId} to status ${status}`,
      req
    });

    res.json({ success: true, message: 'Attendance record updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function submitSession(req, res, next) {
  try {
    const id = req.params.id || req.params.sessionId;

    const [sessions] = await db.query(
      `SELECT s.*, c.class_name, c.section, sub.subject_name 
       FROM attendance_sessions s
       JOIN classes c ON s.class_id = c.id
       JOIN subjects sub ON s.subject_id = sub.id
       WHERE s.id = ? LIMIT 1`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    const session = sessions[0];
    if (session.status === 'FINALIZED') {
      return res.status(400).json({ success: false, message: 'Session is already finalized.' });
    }

    // Ensure all class students have records before submitting
    const [classStudents] = await db.query(
      `SELECT s.id AS student_table_id
       FROM students s
       WHERE (s.class_id = ? OR s.id IN (SELECT student_id FROM class_students WHERE class_id = ? AND is_active = TRUE))
         AND s.is_active = TRUE`,
      [session.class_id, session.class_id]
    );

    for (const cs of classStudents) {
      await db.query(
        `INSERT IGNORE INTO attendance_records 
         (session_id, student_id, status, recognition_method, similarity_score, marked_at)
         VALUES (?, ?, 'ABSENT', 'SYSTEM', 0.0, NOW())`,
        [id, cs.student_table_id]
      );
    }

    // Recalculate accurate attendance totals
    const [counts] = await db.query(
      `SELECT 
         COUNT(*) AS total_students,
         SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS total_present,
         SUM(CASE WHEN status != 'PRESENT' THEN 1 ELSE 0 END) AS total_absent
       FROM attendance_records
       WHERE session_id = ?`,
      [id]
    );

    const totalStudents = Number(counts[0].total_students || classStudents.length);
    const totalPresent = Number(counts[0].total_present || 0);
    const totalAbsent = Number(counts[0].total_absent || 0);

    await db.query(
      `UPDATE attendance_sessions 
       SET status = 'SUBMITTED',
           total_students = ?,
           total_present = ?,
           total_absent = ?,
           submitted_at = NOW(),
           end_time = COALESCE(end_time, NOW())
       WHERE id = ?`,
      [totalStudents, totalPresent, totalAbsent, id]
    );

    // Notify admins for review
    await notifyAdmins({
      title: 'Attendance Session Submitted',
      message: `Session #${id} for ${session.class_name} (${session.section}) - ${session.subject_name} has been submitted by the faculty and requires final review.`,
      type: 'ATTENDANCE'
    });

    await logAudit({
      userId: req.user.id,
      action: 'ATTENDANCE_SESSION_SUBMITTED',
      entityType: 'ATTENDANCE_SESSION',
      entityId: id,
      description: `Submitted attendance session ID ${id} for administrative review`,
      req
    });

    res.json({
      success: true,
      message: 'Attendance submitted successfully. The session is now pending administrator finalization.',
      status: 'SUBMITTED'
    });
  } catch (err) {
    next(err);
  }
}

async function finalizeSession(req, res, next) {
  try {
    const { id } = req.params;

    const [sessions] = await db.query(
      `SELECT s.*, c.class_name, c.section, sub.subject_name, u.full_name AS teacher_name 
       FROM attendance_sessions s
       JOIN classes c ON s.class_id = c.id
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN teachers t ON s.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE s.id = ? LIMIT 1`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    const session = sessions[0];

    await db.query(
      `UPDATE attendance_sessions 
       SET status = 'FINALIZED',
           finalized_at = NOW()
       WHERE id = ?`,
      [id]
    );

    // Check for absent students to notify parents via email if configured
    const [absents] = await db.query(
      `SELECT 
         s.parent_email,
         s.parent_name,
         u.full_name AS student_name
       FROM attendance_records ar
       JOIN students s ON ar.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ar.session_id = ? AND ar.status = 'ABSENT' AND s.parent_email IS NOT NULL`,
      [id]
    );

    for (const abs of absents) {
      await sendAbsenceNotificationEmail(
        abs.parent_email,
        abs.parent_name,
        abs.student_name,
        session.session_date,
        session.subject_name
      );
    }

    await logAudit({
      userId: req.user.id,
      action: 'ATTENDANCE_SESSION_FINALIZED',
      entityType: 'ATTENDANCE_SESSION',
      entityId: id,
      description: `Administrator finalized attendance session ID ${id}`,
      req
    });

    res.json({
      success: true,
      message: 'Attendance session finalized successfully. Records are locked.',
      status: 'FINALIZED'
    });
  } catch (err) {
    next(err);
  }
}

async function getAllSessions(req, res, next) {
  try {
    const { classId, subjectId, teacherId, status, dateFrom, dateTo } = req.query;

    let query = `
      SELECT 
        s.id,
        s.class_id,
        s.subject_id,
        s.teacher_id,
        s.session_date,
        s.start_time,
        s.end_time,
        s.status,
        s.capture_image,
        s.total_students,
        s.total_present,
        s.total_absent,
        s.total_unknown,
        s.submitted_at,
        s.finalized_at,
        s.created_at,
        c.class_name,
        c.section,
        sub.subject_code,
        sub.subject_name,
        u.full_name AS teacher_name
      FROM attendance_sessions s
      JOIN classes c ON s.class_id = c.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN teachers t ON s.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (classId) {
      query += ' AND s.class_id = ?';
      params.push(classId);
    }
    if (subjectId) {
      query += ' AND s.subject_id = ?';
      params.push(subjectId);
    }
    if (teacherId) {
      query += ' AND s.teacher_id = ?';
      params.push(teacherId);
    }
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    if (dateFrom) {
      query += ' AND s.session_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND s.session_date <= ?';
      params.push(dateTo);
    }

    // Role filtering: teachers only see their own sessions unless admin
    if (req.user.role === 'TEACHER') {
      const [tRows] = await db.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (tRows.length > 0) {
        query += ' AND s.teacher_id = ?';
        params.push(tRows[0].id);
      }
    }

    query += ' ORDER BY s.session_date DESC, s.id DESC';

    const [sessions] = await db.query(query, params);
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSession,
  captureAndRecognizeGroup,
  getSessionDetails,
  updateAttendanceRecord,
  submitSession,
  finalizeSession,
  getAllSessions
};
