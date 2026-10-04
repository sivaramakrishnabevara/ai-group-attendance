const db = require('../config/db');

async function getDashboardSummary(req, res, next) {
  try {
    // 1. Counts
    const [[{ totalStudents }]] = await db.query('SELECT COUNT(*) AS totalStudents FROM students WHERE is_active = TRUE');
    const [[{ totalTeachers }]] = await db.query('SELECT COUNT(*) AS totalTeachers FROM teachers WHERE is_active = TRUE');
    const [[{ totalClasses }]] = await db.query('SELECT COUNT(*) AS totalClasses FROM classes WHERE is_active = TRUE');
    const [[{ totalSubjects }]] = await db.query('SELECT COUNT(*) AS totalSubjects FROM subjects WHERE is_active = TRUE');

    // 2. Today's Attendance Aggregate
    const [[todayStats]] = await db.query(
      `SELECT 
         COUNT(DISTINCT s.id) AS todaySessions,
         COALESCE(SUM(s.total_present), 0) AS todayPresent,
         COALESCE(SUM(s.total_absent), 0) AS todayAbsent,
         COALESCE(SUM(s.total_unknown), 0) AS todayUnknown,
         COALESCE(SUM(s.total_students), 0) AS todayTotalEnrolled
       FROM attendance_sessions s
       WHERE s.session_date = CURDATE()`
    );

    // 3. Attendance Overview Chart (Last 7 days)
    const [weeklyOverview] = await db.query(
      `SELECT 
         s.session_date AS date,
         COALESCE(SUM(s.total_present), 0) AS present,
         COALESCE(SUM(s.total_absent), 0) AS absent,
         COALESCE(SUM(s.total_unknown), 0) AS unknown
       FROM attendance_sessions s
       WHERE s.session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY s.session_date
       ORDER BY s.session_date ASC`
    );

    // 4. Class Attendance Comparison
    const [classAttendance] = await db.query(
      `SELECT 
         c.class_name,
         c.section,
         COUNT(DISTINCT s.id) AS total_sessions,
         COALESCE(SUM(s.total_present), 0) AS present_count,
         COALESCE(SUM(s.total_students), 0) AS enrolled_count,
         CASE 
           WHEN SUM(s.total_students) > 0 
           THEN ROUND((SUM(s.total_present) / SUM(s.total_students)) * 100, 1) 
           ELSE 0 
         END AS attendance_percentage
       FROM classes c
       LEFT JOIN attendance_sessions s ON c.id = s.class_id
       WHERE c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.class_name ASC`
    );

    // 5. Low Attendance Students (< student.low_attendance_threshold or default 75%)
    const [lowAttendanceStudents] = await db.query(
      `SELECT 
         st.id,
         st.student_id,
         st.roll_number,
         u.full_name,
         u.email,
         c.class_name,
         c.section,
         st.low_attendance_threshold,
         COUNT(ar.id) AS total_marked_classes,
         SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS attended_classes,
         CASE 
           WHEN COUNT(ar.id) > 0 
           THEN ROUND((SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(ar.id)) * 100, 1) 
           ELSE 0 
         END AS attendance_rate
       FROM students st
       JOIN users u ON st.user_id = u.id
       JOIN classes c ON st.class_id = c.id
       LEFT JOIN attendance_records ar ON st.id = ar.student_id
       WHERE st.is_active = TRUE
       GROUP BY st.id
       HAVING total_marked_classes > 0 AND attendance_rate < st.low_attendance_threshold
       ORDER BY attendance_rate ASC
       LIMIT 10`
    );

    // 6. Recent Sessions
    const [recentSessions] = await db.query(
      `SELECT 
         s.id,
         s.session_date,
         s.status,
         s.total_students,
         s.total_present,
         s.total_absent,
         s.total_unknown,
         s.created_at,
         c.class_name,
         c.section,
         sub.subject_name,
         sub.subject_code,
         u.full_name AS teacher_name
       FROM attendance_sessions s
       JOIN classes c ON s.class_id = c.id
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN teachers t ON s.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT 6`
    );

    // 7. Recent System Activity (Audit Logs)
    const [recentActivity] = await db.query(
      `SELECT 
         a.id,
         a.action,
         a.description,
         a.ip_address,
         a.created_at,
         u.full_name AS user_name,
         u.role AS user_role
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 8`
    );

    res.json({
      success: true,
      data: {
        cards: {
          totalStudents: Number(totalStudents),
          totalTeachers: Number(totalTeachers),
          totalClasses: Number(totalClasses),
          totalSubjects: Number(totalSubjects),
          todaySessions: Number(todayStats.todaySessions),
          todayPresent: Number(todayStats.todayPresent),
          todayAbsent: Number(todayStats.todayAbsent),
          todayUnknown: Number(todayStats.todayUnknown),
          todayTotalEnrolled: Number(todayStats.todayTotalEnrolled)
        },
        charts: {
          weeklyOverview,
          classAttendance
        },
        lowAttendanceStudents,
        recentSessions,
        recentActivity
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary
};
