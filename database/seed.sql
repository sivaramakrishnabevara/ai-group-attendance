-- =========================================================
-- AI GROUP ATTENDANCE MANAGEMENT SYSTEM
-- SEED DATA: database/seed.sql
-- =========================================================

USE ai_group_attendance;

SET FOREIGN_KEY_CHECKS = 0;

-- Clear previous data
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE password_resets;
TRUNCATE TABLE notifications;
TRUNCATE TABLE unknown_faces;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE attendance_sessions;
TRUNCATE TABLE face_embeddings;
TRUNCATE TABLE student_face_profiles;
TRUNCATE TABLE teacher_subjects;
TRUNCATE TABLE teacher_classes;
TRUNCATE TABLE class_students;
TRUNCATE TABLE subjects;
TRUNCATE TABLE teachers;
TRUNCATE TABLE students;
TRUNCATE TABLE classes;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- 1. USERS
-- Default Simple Passwords:
-- Admin (admin@aigroup.com or admin)       -> 1234
-- Teacher (teacher@aigroup.com or EMP001)  -> 1234
-- Student (student@aigroup.com or 21AI01)  -> 1234
-- Hash for '1234': $2a$10$.djI6Ol1jiVqpc5iiQaDWOjEVY1pBcp1synUvOi1qXagqtsbiGYMe
-- =========================================================
INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active, created_at)
VALUES
(1, 'System Administrator', 'admin@aigroup.com', '9876543210', '$2a$10$.djI6Ol1jiVqpc5iiQaDWOjEVY1pBcp1synUvOi1qXagqtsbiGYMe', 'ADMIN', TRUE, NOW()),
(2, 'Prof. Alex Johnson', 'teacher@aigroup.com', '9876543211', '$2a$10$.djI6Ol1jiVqpc5iiQaDWOjEVY1pBcp1synUvOi1qXagqtsbiGYMe', 'TEACHER', TRUE, NOW()),
(3, 'John Doe', 'student@aigroup.com', '9876543212', '$2a$10$.djI6Ol1jiVqpc5iiQaDWOjEVY1pBcp1synUvOi1qXagqtsbiGYMe', 'STUDENT', TRUE, NOW()),
(4, 'Sarah Connor', 'sarah@aigroup.com', '9876543213', '$2a$10$.djI6Ol1jiVqpc5iiQaDWOjEVY1pBcp1synUvOi1qXagqtsbiGYMe', 'STUDENT', TRUE, NOW()),
(5, 'Michael Chang', 'michael@aigroup.com', '9876543214', '$2a$10$.djI6Ol1jiVqpc5iiQaDWOjEVY1pBcp1synUvOi1qXagqtsbiGYMe', 'STUDENT', TRUE, NOW());

-- =========================================================
-- 2. CLASSES
-- =========================================================
INSERT INTO classes (id, class_name, section, academic_year, semester, is_active, created_at)
VALUES
(1, 'B.Tech AI & Data Science', 'A', '2026-2027', '5th Semester', TRUE, NOW()),
(2, 'B.Tech Computer Science', 'B', '2026-2027', '5th Semester', TRUE, NOW());

-- =========================================================
-- 3. TEACHERS
-- =========================================================
INSERT INTO teachers (id, user_id, employee_id, department, designation, is_active, created_at)
VALUES
(1, 2, 'EMP001', 'Artificial Intelligence & Data Science', 'Associate Professor', TRUE, NOW());

-- =========================================================
-- 4. SUBJECTS
-- =========================================================
INSERT INTO subjects (id, subject_code, subject_name, description, is_active, created_at)
VALUES
(1, 'AI501', 'Artificial Intelligence', 'Foundations of AI, search algorithms and reasoning', TRUE, NOW()),
(2, 'DB501', 'Database Management Systems', 'Relational database design, SQL and transactions', TRUE, NOW()),
(3, 'ML501', 'Machine Learning & Neural Networks', 'Deep learning, CNNs, face embeddings and recognition', TRUE, NOW()),
(4, 'CV501', 'Computer Vision', 'Image processing, feature detection, YuNet and SFace', TRUE, NOW());

-- =========================================================
-- 5. STUDENTS
-- =========================================================
INSERT INTO students (id, user_id, student_id, roll_number, class_id, parent_name, parent_phone, parent_email, date_of_birth, gender, address, admission_date, low_attendance_threshold, is_active, created_at)
VALUES
(1, 3, 'STU001', '21AI01', 1, 'Robert Doe', '9876543220', 'parent.doe@aigroup.com', '2004-05-14', 'MALE', '123 Campus Avenue, Silicon City', '2023-08-01', 75.00, TRUE, NOW()),
(2, 4, 'STU002', '21AI02', 1, 'Elena Connor', '9876543221', 'parent.connor@aigroup.com', '2004-08-22', 'FEMALE', '456 Tech Boulevard, Innovation Park', '2023-08-01', 75.00, TRUE, NOW()),
(3, 5, 'STU003', '21AI03', 1, 'David Chang', '9876543222', 'parent.chang@aigroup.com', '2004-11-10', 'MALE', '789 Science Street, Metro Hills', '2023-08-01', 75.00, TRUE, NOW());

-- =========================================================
-- 6. CLASS STUDENTS
-- =========================================================
INSERT INTO class_students (class_id, student_id, joined_date, is_active, created_at)
VALUES
(1, 1, '2023-08-01', TRUE, NOW()),
(1, 2, '2023-08-01', TRUE, NOW()),
(1, 3, '2023-08-01', TRUE, NOW());

-- =========================================================
-- 7. TEACHER CLASSES
-- =========================================================
INSERT INTO teacher_classes (teacher_id, class_id, created_at)
VALUES
(1, 1, NOW()),
(1, 2, NOW());

-- =========================================================
-- 8. TEACHER SUBJECTS
-- =========================================================
INSERT INTO teacher_subjects (teacher_id, subject_id, created_at)
VALUES
(1, 1, NOW()),
(1, 3, NOW()),
(1, 4, NOW());

-- =========================================================
-- 9. STUDENT FACE PROFILES
-- =========================================================
INSERT INTO student_face_profiles (id, student_id, registration_status, images_count, quality_score, registered_at, created_at)
VALUES
(1, 1, 'PENDING', 0, NULL, NULL, NOW()),
(2, 2, 'PENDING', 0, NULL, NULL, NOW()),
(3, 3, 'PENDING', 0, NULL, NULL, NOW());

-- =========================================================
-- 10. SYSTEM NOTIFICATIONS
-- =========================================================
INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
VALUES
(1, 'System Initialized', 'AI Group Attendance Management System database and environment successfully initialized.', 'SUCCESS', FALSE, NOW()),
(2, 'Welcome Prof. Alex', 'You have been assigned to B.Tech AI & Data Science (Section A) for Artificial Intelligence and Computer Vision.', 'INFO', FALSE, NOW()),
(3, 'Face Enrollment Pending', 'Please complete your 5-image biometric face registration to enable automated attendance recognition.', 'WARNING', FALSE, NOW());

-- =========================================================
-- 11. AUDIT LOGS
-- =========================================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at)
VALUES
(1, 'DATABASE_SEED', 'SYSTEM', 1, 'Initial seed execution completed with demo administrator, teacher, and student records.', '127.0.0.1', 'DatabaseSeeder/1.0', NOW());