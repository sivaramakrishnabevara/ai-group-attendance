const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function createUploader(subfolder) {
  const uploadDir = path.join(__dirname, '..', 'uploads', subfolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeRandom = crypto.randomBytes(16).toString('hex');
      const filename = `${subfolder.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_${safeRandom}${ext}`;
      cb(null, filename);
    }
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(mime) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error('Invalid image file type. Only JPG, JPEG, and PNG images are permitted.'),
        false
      );
    }
    cb(null, true);
  };

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
  });
}

module.exports = {
  uploadStudentFace: createUploader('students'),
  uploadAttendance: createUploader('attendance'),
  uploadUnknownFace: createUploader('unknown-faces')
};
