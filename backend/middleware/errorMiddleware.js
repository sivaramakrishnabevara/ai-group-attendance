function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[ERROR ${statusCode}] ${req.method} ${req.originalUrl}:`, err.message);

  let userMessage = err.message || 'An unexpected internal server error occurred.';

  // Format multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    userMessage = 'Uploaded file exceeds the maximum permitted limit of 10MB.';
  }

  res.status(statusCode).json({
    success: false,
    message: userMessage,
    code: err.code || 'SERVER_ERROR'
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
