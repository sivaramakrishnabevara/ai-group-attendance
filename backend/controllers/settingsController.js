const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');

// In-memory or database persistent system settings
let systemSettings = {
  institutionName: 'AI Institute of Technology',
  academicYear: '2026-2027',
  defaultThreshold: 75.0,
  faceRecognitionThreshold: 0.36,
  allowTeacherManualOverride: true,
  emailAbsenceAlerts: true
};

async function getSettings(req, res, next) {
  try {
    res.json({ success: true, data: systemSettings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const {
      institutionName,
      academicYear,
      defaultThreshold,
      faceRecognitionThreshold,
      allowTeacherManualOverride,
      emailAbsenceAlerts
    } = req.body;

    if (institutionName !== undefined) systemSettings.institutionName = institutionName;
    if (academicYear !== undefined) systemSettings.academicYear = academicYear;
    if (defaultThreshold !== undefined) systemSettings.defaultThreshold = parseFloat(defaultThreshold);
    if (faceRecognitionThreshold !== undefined) {
      systemSettings.faceRecognitionThreshold = parseFloat(faceRecognitionThreshold);
    }
    if (allowTeacherManualOverride !== undefined) {
      systemSettings.allowTeacherManualOverride = Boolean(allowTeacherManualOverride);
    }
    if (emailAbsenceAlerts !== undefined) {
      systemSettings.emailAbsenceAlerts = Boolean(emailAbsenceAlerts);
    }

    await logAudit({
      userId: req.user.id,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      description: 'System configurations modified by administrator',
      req
    });

    res.json({ success: true, message: 'Settings updated successfully.', data: systemSettings });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings
};
