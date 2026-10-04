const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'AI Group Attendance <noreply@aigroup.com>';

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    }
  });
}

async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`[EMAIL_SERVICE: LOCAL/DEV SIMULATION] To: ${to} | Subject: "${subject}"`);
    return { simulated: true, to, subject };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL_SERVICE_ERROR] Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendRegistrationEmail(user, tempPassword = null) {
  const subject = 'Welcome to AI Group Attendance Management System';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #059669;">Welcome, ${user.full_name}!</h2>
      <p>Your account has been created on the AI Group Attendance Management platform.</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      ${tempPassword ? `<p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>` : ''}
      <p>Please log in and complete your facial biometrics registration if you are a student.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b;">This is an automated institutional message.</p>
    </div>
  `;
  return sendMail({ to: user.email, subject, html });
}

async function sendPasswordResetEmail(user, resetUrl) {
  const subject = 'Password Reset Request - AI Group Attendance System';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>Hello ${user.full_name},</p>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
      <p>If you did not request this, please ignore this email.</p>
      <p style="font-size: 12px; color: #64748b;">Link expires in 1 hour.</p>
    </div>
  `;
  return sendMail({ to: user.email, subject, html });
}

async function sendAbsenceNotificationEmail(parentEmail, parentName, studentName, sessionDate, subjectName) {
  if (!parentEmail) return;
  const subject = `Attendance Notice: ${studentName} Marked Absent on ${sessionDate}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <h3 style="color: #dc2626;">Attendance Notification</h3>
      <p>Dear ${parentName || 'Parent/Guardian'},</p>
      <p>This is to inform you that your ward <strong>${studentName}</strong> was marked <strong>ABSENT</strong> for <strong>${subjectName}</strong> on <strong>${sessionDate}</strong>.</p>
      <p>If you have any questions or this was an excused absence, please contact the class faculty coordinator.</p>
      <p style="font-size: 12px; color: #64748b;">AI Group Attendance Management System</p>
    </div>
  `;
  return sendMail({ to: parentEmail, subject, html });
}

module.exports = {
  sendMail,
  sendRegistrationEmail,
  sendPasswordResetEmail,
  sendAbsenceNotificationEmail
};
