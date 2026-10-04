const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');
const aiService = require('../services/aiService');
const { createNotification } = require('../services/notificationService');

const VALID_POSES = {
  1: 'natural_front',
  2: 'slight_left',
  3: 'slight_right',
  4: 'slight_up_down',
  5: 'natural_front'
};

async function getAllStudents(req, res, next) {
  try {
    const { search, classId, status } = req.query;

    let query = `
      SELECT 
        s.id,
        s.user_id,
        s.student_id,
        s.roll_number,
        s.class_id,
        s.parent_name,
        s.parent_phone,
        s.parent_email,
        s.date_of_birth,
        s.gender,
        s.address,
        s.admission_date,
        s.low_attendance_threshold,
        s.is_active,
        s.created_at,
        u.full_name,
        u.email,
        u.phone,
        u.profile_image,
        c.class_name,
        c.section,
        COALESCE(fp.registration_status, 'PENDING') AS face_registration_status,
        COALESCE(fp.images_count, 0) AS face_images_count,
        fp.quality_score AS face_quality_score
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN student_face_profiles fp ON s.id = fp.student_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR s.student_id LIKE ? OR s.roll_number LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (classId) {
      query += ` AND s.class_id = ?`;
      params.push(classId);
    }

    if (status !== undefined && status !== '') {
      query += ` AND s.is_active = ?`;
      params.push(status === 'true' || status === '1');
    }

    query += ` ORDER BY s.id DESC`;

    const [students] = await db.query(query, params);
    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
}

async function getStudentById(req, res, next) {
  try {
    const { id } = req.params;

    const [students] = await db.query(
      `SELECT 
         s.*,
         u.full_name,
         u.email,
         u.phone,
         u.profile_image,
         c.class_name,
         c.section,
         c.academic_year,
         COALESCE(fp.registration_status, 'PENDING') AS face_registration_status,
         COALESCE(fp.images_count, 0) AS face_images_count,
         fp.quality_score AS face_quality_score,
         fp.registered_at AS face_registered_at
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN student_face_profiles fp ON s.id = fp.student_id
       WHERE s.id = ? LIMIT 1`,
      [id]
    );

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const student = students[0];

    // Attendance stats
    const [[stats]] = await db.query(
      `SELECT 
         COUNT(*) AS total_sessions,
         SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
         SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) AS late_count,
         SUM(CASE WHEN status = 'EXCUSED' THEN 1 ELSE 0 END) AS excused_count
       FROM attendance_records
       WHERE student_id = ?`,
      [id]
    );

    const total = Number(stats.total_sessions || 0);
    const present = Number(stats.present_count || 0);
    const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100.0;

    res.json({
      success: true,
      data: {
        ...student,
        stats: {
          totalSessions: total,
          present,
          absent: Number(stats.absent_count || 0),
          late: Number(stats.late_count || 0),
          excused: Number(stats.excused_count || 0),
          attendancePercentage: rate,
          isLowAttendance: rate < Number(student.low_attendance_threshold)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function createStudent(req, res, next) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      fullName,
      email,
      phone,
      password,
      studentId,
      rollNumber,
      classId,
      parentName,
      parentPhone,
      parentEmail,
      dateOfBirth,
      gender,
      address,
      admissionDate,
      lowAttendanceThreshold
    } = req.body;

    if (!fullName || !email || !studentId || !classId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Full Name, Email, Student ID, and Class are required fields.'
      });
    }

    // Check email uniqueness
    const [existingEmail] = await connection.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingEmail.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    // Check studentId uniqueness
    const [existingId] = await connection.query('SELECT id FROM students WHERE student_id = ?', [studentId.trim()]);
    if (existingId.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'A student with this Student ID already exists.' });
    }

    // Hash password (default: studentId if not provided)
    const initialPassword = password || studentId.trim();
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    // 1. Insert User
    const [userResult] = await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'STUDENT', TRUE, NOW())`,
      [fullName.trim(), email.trim().toLowerCase(), phone || null, passwordHash]
    );
    const userId = userResult.insertId;

    // 2. Insert Student
    const [studentResult] = await connection.query(
      `INSERT INTO students (
         user_id, student_id, roll_number, class_id, parent_name, parent_phone,
         parent_email, date_of_birth, gender, address, admission_date,
         low_attendance_threshold, is_active, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [
        userId,
        studentId.trim(),
        rollNumber || null,
        classId,
        parentName || null,
        parentPhone || null,
        parentEmail || null,
        dateOfBirth || null,
        gender || null,
        address || null,
        admissionDate || null,
        lowAttendanceThreshold || 75.00
      ]
    );
    const newStudentId = studentResult.insertId;

    // 3. Insert into class_students junction
    await connection.query(
      `INSERT INTO class_students (class_id, student_id, joined_date, is_active, created_at)
       VALUES (?, ?, CURDATE(), TRUE, NOW())
       ON DUPLICATE KEY UPDATE is_active = TRUE`,
      [classId, newStudentId]
    );

    // 4. Initialize face profile
    await connection.query(
      `INSERT INTO student_face_profiles (student_id, registration_status, images_count, created_at)
       VALUES (?, 'PENDING', 0, NOW())`,
      [newStudentId]
    );

    // 5. Send internal welcome notification
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES (?, 'Student Registration Complete', 'Welcome to the AI Attendance System. Please complete your 5-step biometric face enrollment.', 'INFO', FALSE, NOW())`,
      [userId]
    );

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      action: 'STUDENT_CREATED',
      entityType: 'STUDENT',
      entityId: newStudentId,
      description: `Created student ${fullName} (${studentId})`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      studentId: newStudentId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const {
      fullName,
      phone,
      rollNumber,
      classId,
      parentName,
      parentPhone,
      parentEmail,
      dateOfBirth,
      gender,
      address,
      lowAttendanceThreshold,
      isActive
    } = req.body;

    const [students] = await db.query('SELECT user_id, class_id FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }
    const { user_id, class_id: oldClassId } = students[0];

    // Update user info
    if (fullName !== undefined || phone !== undefined || isActive !== undefined) {
      await db.query(
        `UPDATE users 
         SET full_name = COALESCE(?, full_name),
             phone = COALESCE(?, phone),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [fullName, phone, isActive, user_id]
      );
    }

    // Update student info
    await db.query(
      `UPDATE students
       SET roll_number = COALESCE(?, roll_number),
           class_id = COALESCE(?, class_id),
           parent_name = COALESCE(?, parent_name),
           parent_phone = COALESCE(?, parent_phone),
           parent_email = COALESCE(?, parent_email),
           date_of_birth = COALESCE(?, date_of_birth),
           gender = COALESCE(?, gender),
           address = COALESCE(?, address),
           low_attendance_threshold = COALESCE(?, low_attendance_threshold),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        rollNumber,
        classId,
        parentName,
        parentPhone,
        parentEmail,
        dateOfBirth,
        gender,
        address,
        lowAttendanceThreshold,
        isActive,
        id
      ]
    );

    // If class changed, update class_students
    if (classId && Number(classId) !== Number(oldClassId)) {
      await db.query(
        `INSERT INTO class_students (class_id, student_id, joined_date, is_active, created_at)
         VALUES (?, ?, CURDATE(), TRUE, NOW())
         ON DUPLICATE KEY UPDATE is_active = TRUE`,
        [classId, id]
      );
    }

    await logAudit({
      userId: req.user.id,
      action: 'STUDENT_UPDATED',
      entityType: 'STUDENT',
      entityId: id,
      description: `Updated student record ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Student record updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function deactivateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const [students] = await db.query('SELECT user_id FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const userId = students[0].user_id;
    await db.query('UPDATE students SET is_active = FALSE WHERE id = ?', [id]);
    await db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [userId]);

    await logAudit({
      userId: req.user.id,
      action: 'STUDENT_DEACTIVATED',
      entityType: 'STUDENT',
      entityId: id,
      description: `Deactivated student ID ${id}`,
      req
    });

    res.json({ success: true, message: 'Student successfully deactivated.' });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// FACE BIOMETRIC REGISTRATION (5 IMAGES)
// -------------------------------------------------------------

async function registerFaceStep(req, res, next) {
  try {
    const studentIdParam = req.params.id;
    const imageNumber = parseInt(req.body.imageNumber, 10);

    if (!imageNumber || imageNumber < 1 || imageNumber > 5) {
      return res.status(400).json({
        success: false,
        message: 'Image number must be an integer between 1 and 5.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    // Determine target student ID (Student can enroll themselves, Admin can enroll any student)
    let targetStudentId = studentIdParam;
    if (req.user.role === 'STUDENT') {
      const [stu] = await db.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (stu.length === 0) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }
      targetStudentId = stu[0].id;
    }

    const [profiles] = await db.query(
      'SELECT id, registration_status, images_count FROM student_face_profiles WHERE student_id = ?',
      [targetStudentId]
    );

    let profileId;
    if (profiles.length === 0) {
      const [newProfile] = await db.query(
        'INSERT INTO student_face_profiles (student_id, registration_status, images_count, created_at) VALUES (?, "PROCESSING", 0, NOW())',
        [targetStudentId]
      );
      profileId = newProfile.insertId;
    } else {
      profileId = profiles[0].id;
    }

    const expectedPose = VALID_POSES[imageNumber] || 'natural_front';
    const filePath = req.file.path;

    // Call Python AI Service YuNet + SFace
    const aiResult = await aiService.registerFace(filePath, expectedPose);

    if (!aiResult.success) {
      return res.status(422).json({
        success: false,
        message: aiResult.message || 'Face validation failed.',
        validation: aiResult.validation
      });
    }

    const embeddingJson = JSON.stringify(aiResult.embedding);
    const qualityScore = aiResult.quality_score || 0.85;
    const relImagePath = `/uploads/students/${path.basename(filePath)}`;

    // Insert or replace enrollment image embedding
    await db.query(
      `INSERT INTO face_embeddings 
       (student_id, face_profile_id, image_number, image_path, embedding_json, embedding_dimension, quality_score, pose, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         image_path = VALUES(image_path),
         embedding_json = VALUES(embedding_json),
         quality_score = VALUES(quality_score),
         pose = VALUES(pose),
         created_at = NOW()`,
      [
        targetStudentId,
        profileId,
        imageNumber,
        relImagePath,
        embeddingJson,
        aiResult.embedding_dimension || 128,
        qualityScore,
        expectedPose
      ]
    );

    // Count enrolled valid images for this student
    const [[countRow]] = await db.query(
      'SELECT COUNT(*) AS total_images, AVG(quality_score) AS avg_quality FROM face_embeddings WHERE student_id = ?',
      [targetStudentId]
    );

    const totalImages = Number(countRow.total_images);
    const avgQuality = Number(countRow.avg_quality || qualityScore);
    const isCompleted = totalImages >= 1;
    const newStatus = isCompleted ? 'COMPLETED' : 'PROCESSING';

    await db.query(
      `UPDATE student_face_profiles 
       SET registration_status = ?,
           images_count = ?,
           quality_score = ?,
           registered_at = CASE WHEN ? = TRUE THEN NOW() ELSE registered_at END
       WHERE id = ?`,
      [newStatus, totalImages, avgQuality, isCompleted, profileId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'FACE_IMAGE_REGISTERED',
      entityType: 'FACE_EMBEDDING',
      entityId: targetStudentId,
      description: `Registered face sample ${imageNumber}/5 (Pose: ${expectedPose}) for student ID ${targetStudentId}`,
      req
    });

    res.json({
      success: true,
      message: `Image ${imageNumber}/5 accepted and enrolled successfully.`,
      currentStep: imageNumber,
      totalRegistered: totalImages,
      isCompleted,
      qualityScore,
      pose: expectedPose
    });
  } catch (err) {
    next(err);
  }
}

async function getFaceRegistrationStatus(req, res, next) {
  try {
    const studentIdParam = req.params.id;
    let targetStudentId = studentIdParam;

    if (req.user.role === 'STUDENT') {
      const [stu] = await db.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (stu.length === 0) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }
      targetStudentId = stu[0].id;
    }

    const [profiles] = await db.query(
      `SELECT 
         p.*,
         s.student_id AS student_code,
         u.full_name
       FROM student_face_profiles p
       JOIN students s ON p.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE p.student_id = ? LIMIT 1`,
      [targetStudentId]
    );

    const [embeddings] = await db.query(
      `SELECT image_number, image_path, quality_score, pose, created_at 
       FROM face_embeddings 
       WHERE student_id = ? 
       ORDER BY image_number ASC`,
      [targetStudentId]
    );

    const profile = profiles.length > 0 ? profiles[0] : { registration_status: 'PENDING', images_count: 0 };

    res.json({
      success: true,
      data: {
        profile,
        enrolledImages: embeddings,
        isCompleted: profile.registration_status === 'COMPLETED'
      }
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// STUDENT SELF-SERVICE DASHBOARD
// -------------------------------------------------------------

async function getStudentDashboard(req, res, next) {
  try {
    const [stu] = await db.query(
      `SELECT s.id, s.student_id, s.roll_number, s.class_id, s.low_attendance_threshold,
              c.class_name, c.section, c.academic_year,
              p.registration_status, p.images_count
       FROM students s
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN student_face_profiles p ON s.id = p.student_id
       WHERE s.user_id = ? LIMIT 1`,
      [req.user.id]
    );

    if (stu.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const student = stu[0];

    // Overall attendance counts
    const [[counts]] = await db.query(
      `SELECT 
         COUNT(*) AS total_classes,
         SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
         SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) AS late_count,
         SUM(CASE WHEN status = 'EXCUSED' THEN 1 ELSE 0 END) AS excused_count
       FROM attendance_records
       WHERE student_id = ?`,
      [student.id]
    );

    const total = Number(counts.total_classes || 0);
    const present = Number(counts.present_count || 0);
    const absent = Number(counts.absent_count || 0);
    const late = Number(counts.late_count || 0);
    const excused = Number(counts.excused_count || 0);
    const overallPercentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100.0;
    const isLowAttendance = overallPercentage < Number(student.low_attendance_threshold);

    // Subject-wise breakdown
    const [subjectBreakdown] = await db.query(
      `SELECT 
         sub.id AS subject_id,
         sub.subject_code,
         sub.subject_name,
         COUNT(ar.id) AS total_sessions,
         SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
         SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent,
         CASE 
           WHEN COUNT(ar.id) > 0 
           THEN ROUND((SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(ar.id)) * 100, 1)
           ELSE 100.0
         END AS percentage
       FROM subjects sub
       JOIN attendance_sessions ses ON sub.id = ses.subject_id
       JOIN attendance_records ar ON ses.id = ar.session_id AND ar.student_id = ?
       GROUP BY sub.id
       ORDER BY sub.subject_code ASC`,
      [student.id]
    );

    // Recent 10 attendance records
    const [recentAttendance] = await db.query(
      `SELECT 
         ar.id,
         ar.status,
         ar.recognition_method,
         ar.similarity_score,
         ar.marked_at,
         ses.session_date,
         sub.subject_code,
         sub.subject_name,
         u.full_name AS teacher_name
       FROM attendance_records ar
       JOIN attendance_sessions ses ON ar.session_id = ses.id
       JOIN subjects sub ON ses.subject_id = sub.id
       JOIN teachers t ON ses.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE ar.student_id = ?
       ORDER BY ses.session_date DESC, ar.marked_at DESC
       LIMIT 10`,
      [student.id]
    );

    res.json({
      success: true,
      data: {
        student,
        summary: {
          totalClasses: total,
          present,
          absent,
          late,
          excused,
          overallPercentage,
          lowAttendanceThreshold: Number(student.low_attendance_threshold),
          isLowAttendance
        },
        subjectBreakdown,
        recentAttendance
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deactivateStudent,
  registerFaceStep,
  getFaceRegistrationStatus,
  getStudentDashboard
};
