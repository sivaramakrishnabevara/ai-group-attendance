# AI Group Attendance System

An AI-powered Group Attendance Management System using face detection and face recognition.

The system supports three roles:

- Admin
- Teacher
- Student

The application uses React for the frontend, Node.js + Express for the backend, MySQL for database management, and Python FastAPI for AI face recognition.

---

## 🚀 Technology Stack

### Frontend

- React
- Vite
- JavaScript
- HTML5
- CSS3
- Browser Webcam API

### Backend

- Node.js
- Express.js
- MySQL
- mysql2
- JWT Authentication
- bcrypt
- Nodemailer
- Helmet
- CORS
- Multer

### AI Service

- Python
- FastAPI
- OpenCV
- YuNet
- SFace
- NumPy
- Cosine Similarity

### Database

- MySQL
- DBeaver

---

# 📁 Project Structure

```text
ai-group-attendance/
│
├── ai-service/
│   ├── evaluation/
│   │   └── evaluate_model.py
│   │
│   ├── models/
│   │   ├── face_detection_yunet_2023mar.onnx
│   │   └── face_recognition_sface_2021dec.onnx
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   └── api.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── evaluation.py
│   │   ├── face_pipeline.py
│   │   ├── face_validator.py
│   │   └── similarity.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   └── image_processing.py
│   │
│   ├── app.py
│   ├── main.py
│   └── requirements.txt
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── uploads/
│   ├── test/
│   │
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── services/
│   │
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── docs/
│
├── .gitignore
└── README.md