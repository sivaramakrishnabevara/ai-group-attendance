# AI Group Attendance Management System

A production-grade, enterprise AI-powered biometric group classroom attendance management system built with **React + Vite**, **Node.js + Express**, **MySQL (InnoDB / DBeaver compatible)**, and **Python FastAPI (OpenCV YuNet + SFace Biometrics)**.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   React 18 + Vite Frontend  |
                      |    (Port 5173 / Modern UI)  |
                      +--------------+--------------+
                                     |
                                     | REST API (Axios / JWT)
                                     v
                      +-----------------------------+
                      | Node.js + Express.js Backend|
                      |         (Port 5000)         |
                      +------+---------------+------+
                             |               |
              mysql2/promise |               | HTTP REST
                             v               v
                +-----------------+   +--------------------------+
                |   MySQL 8.0     |   | Python 3.11 FastAPI      |
                | (DBeaver/XAMPP) |   | Face Biometrics Service  |
                |   Port: 3306    |   |       (Port 8000)        |
                +-----------------+   +-------------+------------+
                                                    |
                                                    v
                                      +--------------------------+
                                      | YuNet ONNX Face Detector |
                                      +-------------+------------+
                                                    |
                                                    v
                                      +--------------------------+
                                      | SFace ONNX Feature Model |
                                      +-------------+------------+
                                                    |
                                                    v
                                      +--------------------------+
                                      | Cosine Similarity Engine |
                                      |   Threshold = 0.36       |
                                      +--------------------------+
```

---

## Key Features

1. **Enterprise 3-Tier Role-Based Access Control (RBAC)**:
   - **ADMIN**: Student/Teacher CRUD, class and course allocation, session review & finalization, unknown faces mapping, system audit trail, CSV/Excel report exports.
   - **TEACHER**: Live webcam classroom capture, real-time YuNet bounding boxes, SFace cosine matching, manual adjustment table, attendance submission.
   - **STUDENT**: 5-pose guided biometric face registration, personal attendance rate, low attendance alerts, course breakdowns.
2. **5-Pose Guided Biometric Enrollment**:
   - Natural Front, Slight Left, Slight Right, Slight Up/Down, Natural Front.
   - Real-time quality validation (single face constraint, blur detection, illumination check, head turn validation).
   - Generates 128-dimensional normalized vectors stored directly in MySQL (`face_embeddings`).
3. **Group Classroom Attendance**:
   - Single classroom snapshot captures all faces simultaneously.
   - YuNet localizes faces across arbitrary distances and orientations.
   - SFace extracts embeddings and Cosine Similarity compares candidates against enrolled vectors.
   - Auto-categorizes matches into **Recognized (Green)** and **Unknown (Amber)**.
4. **Zero SMS & Pure Compliance**:
   - **No SMS**, no third-party SMS providers, no fake simulations.
   - In-app notification alerts and optional Nodemailer parent absence emails upon finalization.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Axios, Recharts, Lucide React, Modern CSS |
| **Backend** | Node.js, Express.js, `mysql2/promise`, JWT, bcrypt, Helmet, CORS, Multer, Nodemailer |
| **Database** | MySQL (InnoDB, `utf8mb4_unicode_ci`), DBeaver, XAMPP |
| **AI Biometrics** | Python 3.11, FastAPI, OpenCV (`cv2.FaceDetectorYN`, `cv2.FaceRecognizerSF`), NumPy, Pillow |
| **Matching Algorithm** | Cosine Similarity (Evaluated threshold = 0.36) |

---

## Project Folder Structure

```
AI-Group-Attendance/
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   └── logo.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Navbar, Sidebar, StatCard, Badge, Modal, etc.
│   │   │   └── webcam/           # WebcamCapture, FaceBoundingBoxOverlay
│   │   ├── context/              # AuthContext, ToastContext
│   │   ├── layouts/              # MainLayout, AuthLayout
│   │   ├── pages/
│   │   │   ├── admin/            # AdminDashboard, Students, Teachers, Classes, Reports, etc.
│   │   │   ├── auth/             # LoginPage, ForgotPassword, ResetPassword
│   │   │   ├── student/          # StudentDashboard, FaceRegistration, Profile, Subjects
│   │   │   ├── teacher/          # TeacherDashboard, CaptureAttendance, History
│   │   │   └── common/           # NotificationsPage, ProfilePage, NotFoundPage
│   │   ├── services/             # Axios API client
│   │   ├── App.jsx               # Application routes and role protection
│   │   ├── index.css             # White + Green Design System
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── .env
│
├── backend/
│   ├── config/                   # MySQL connection pool (mysql2/promise)
│   ├── controllers/              # Auth, Admin, Student, Teacher, Attendance, Reports, etc.
│   ├── middleware/               # Auth, Role, Upload, Audit, Error
│   ├── routes/                   # Express routes
│   ├── services/                 # AI service client, Email service, Notifications
│   ├── uploads/                  # students/, attendance/, unknown-faces/
│   ├── test/                     # Node test runner suite
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── ai-service/
│   ├── models/                   # YuNet & SFace ONNX model files
│   ├── routes/                   # FastAPI endpoints (/detect-face, /recognize-group, etc.)
│   ├── services/                 # FacePipeline, FaceValidator, Similarity, Evaluation
│   ├── evaluation/               # Model benchmark script (FAR/FRR/F1-Score)
│   ├── main.py                   # FastAPI server entry point
│   ├── requirements.txt
│   └── .env
│
├── database/
│   ├── schema.sql                # 16 InnoDB tables with foreign keys and indexes
│   └── seed.sql                  # Seed data with bcrypt passwords for admin, teacher, student
│
├── docs/
├── .gitignore
└── README.md
```

---

## Database Setup & DBeaver Verification

### Step 1: Start MySQL
Ensure your MySQL server (via XAMPP or native Windows service) is active on port `3306`.

### Step 2: Open DBeaver
1. Launch **DBeaver**.
2. Click **New Database Connection** -> **MySQL**.
3. Set:
   - **Host**: `localhost`
   - **Port**: `3306`
   - **Username**: `root`
   - **Password**: *(Your MySQL password, e.g. empty or as set in your environment)*
4. Click **Test Connection** -> **Finish**.

### Step 3: Create Database & Execute Schema
1. In DBeaver SQL Editor, execute:
   ```sql
   CREATE DATABASE IF NOT EXISTS ai_group_attendance
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```
2. Open and execute [`database/schema.sql`](file:///c:/Users/LENOVO/OneDrive/Desktop/web/database/schema.sql).
3. Open and execute [`database/seed.sql`](file:///c:/Users/LENOVO/OneDrive/Desktop/web/database/seed.sql).

### Step 4: Verify in DBeaver
1. Right-click database `ai_group_attendance` in DBeaver and select **Refresh**.
2. Expand `ai_group_attendance` -> **Tables**.
3. Verify the 16 tables are visible:
   - `users`
   - `students`
   - `teachers`
   - `classes`
   - `subjects`
   - `class_students`
   - `teacher_classes`
   - `teacher_subjects`
   - `student_face_profiles`
   - `face_embeddings`
   - `attendance_sessions`
   - `attendance_records`
   - `unknown_faces`
   - `notifications`
   - `password_resets`
   - `audit_logs`

4. Run verification query:
   ```sql
   USE ai_group_attendance;
   SHOW TABLES;
   ```

---

## Installation & Running the System

### 1. Backend Service (Node.js)
```bash
cd backend
npm install
npm run dev
```
- Server URL: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

### 2. Python AI Biometrics Service (FastAPI)
```bash
cd ai-service

# Create virtual environment (recommended)
python -m venv venv

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run AI service
uvicorn main:app --reload --port 8000
```
- AI Service URL: `http://127.0.0.1:8000`
- Swagger Docs: `http://127.0.0.1:8000/docs`
- Health endpoint: `http://127.0.0.1:8000/health`

### 3. Frontend Web Application (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## Demo Credentials

All test accounts use valid bcrypt hashes and are pre-seeded in `database/seed.sql`:

| Role | Email | Password | Pre-configured Access |
|---|---|---|---|
| **ADMIN** | `admin@aigroup.com` | `admin123` | Full administrative control, all classes & reports |
| **TEACHER** | `teacher@aigroup.com` | `teacher123` | Assigned to B.Tech AI & Data Science (Sec A) |
| **STUDENT** | `student@aigroup.com` | `student123` | Student ID: STU001 (Roll: 21AI01) |

*Tip: The login page includes one-click demo fill buttons for fast testing.*

---

## API Endpoints Reference

### Health
- `GET /api/health` - Unified backend, MySQL, and AI service health check

### Authentication
- `POST /api/auth/login` - Authenticate and return JWT token
- `POST /api/auth/register` - Register new user account
- `GET /api/auth/me` - Fetch authenticated user profile
- `POST /api/auth/logout` - Invalidate session
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token

### Students & Face Biometrics
- `GET /api/students` - List students (with filters)
- `POST /api/students` - Enroll new student
- `PUT /api/students/:id` - Update student profile
- `DELETE /api/students/:id` - Deactivate student
- `POST /api/students/:id/register-face` - Upload 1 of 5 facial enrollment images
- `GET /api/students/:id/face-status` - Query 5-pose registration status

### Attendance & AI Recognition
- `POST /api/attendance/sessions` - Open attendance session
- `POST /api/attendance/sessions/:id/capture-group` - Upload classroom image & run YuNet+SFace+Cosine
- `PUT /api/attendance/sessions/:id/records/:studentId` - Manually override attendance status
- `POST /api/attendance/sessions/:id/submit` - Submit session (status = SUBMITTED)
- `POST /api/attendance/sessions/:id/finalize` - Finalize and lock attendance (status = FINALIZED)

### Unknown Faces & Reports
- `GET /api/unknown-faces` - List detected unknown faces
- `POST /api/unknown-faces/:id/assign` - Map unknown face to student & update attendance
- `GET /api/reports` - Query detailed logs and summary aggregates (CSV export supported)

---

## Model Benchmark & Evaluation

Run the evaluation script to assess YuNet + SFace precision, recall, and optimal cosine thresholds:
```bash
cd ai-service
python evaluation/evaluate_model.py
```
This script benchmarks genuine vs. imposter pairs across a threshold sweep `[0.20 -> 0.60]` confirming an operational threshold of **0.36**.

---

## Troubleshooting

1. **Database connection error (`ECONNREFUSED`)**:
   - Ensure MySQL service is running on `localhost:3306`.
   - Verify `DB_PASSWORD` in `backend/.env` matches your MySQL root password.
2. **AI Service shows `UNAVAILABLE` in health check**:
   - Ensure `uvicorn main:app --port 8000` is running in `ai-service/`.
   - Verify that `ai-service/models/` contains both `face_detection_yunet_2023mar.onnx` and `face_recognition_sface_2021dec.onnx`.
3. **Webcam blocked**:
   - In browser settings, allow camera access for `http://localhost:5173`.
