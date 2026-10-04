import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Settings, ShieldCheck, Mail, Database, Cpu } from 'lucide-react';

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(0.36);
  const [defaultLowAttendance, setDefaultLowAttendance] = useState(75.0);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smtpStatus, setSmtpStatus] = useState('UNVERIFIED');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('system_recognition_threshold', String(threshold));
    localStorage.setItem('default_low_attendance_threshold', String(defaultLowAttendance));
    showSuccess('Biometric and attendance thresholds saved successfully.');
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await api.post('/settings/test-email');
      if (res.data && res.data.success) {
        setSmtpStatus('CONNECTED');
        showSuccess('Test email dispatched successfully.');
      } else {
        setSmtpStatus('FAILED');
        showError('SMTP test email failed. Check your backend .env credentials.');
      }
    } catch (err) {
      setSmtpStatus('FAILED');
      showError(err.response?.data?.message || 'SMTP service test failed.');
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '880px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings & Biometrics</h1>
          <p className="page-subtitle">Configure AI model thresholds, biometric cosine similarity margins, and automated notification channels.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Biometric Engine Settings */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} color="#059669" />
              <h3 className="card-title">AI Biometric Recognition Settings</h3>
            </div>
          </div>

          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Face Recognition Cosine Similarity Threshold</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669' }}>
                  {threshold} (Score ≥ {threshold} = Recognized)
                </span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.60"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                Evaluated optimal threshold for SFace 128D embeddings is <strong>0.36</strong>. Higher values require stricter matching; lower values increase tolerance for varying angles.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Default Minimum Attendance Threshold (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                step="1"
                value={defaultLowAttendance}
                onChange={(e) => setDefaultLowAttendance(parseFloat(e.target.value))}
                className="form-input"
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Students falling below this percentage trigger low-attendance warnings.
              </p>
            </div>

            <button type="submit" className="btn btn-primary btn-sm">
              Save Parameters
            </button>
          </form>
        </div>

        {/* Email & Notifications Settings */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={20} color="#2563eb" />
              <h3 className="card-title">Notification & SMTP Configuration</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.875rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Parent Absence Notice Email Channel</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nodemailer SMTP</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Dispatches absence notifications to parent email upon session finalization. Credentials configured in backend .env.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="btn btn-secondary btn-sm"
              >
                {testingSmtp ? 'Sending Test Email...' : 'Trigger Test Email'}
              </button>
              {smtpStatus !== 'UNVERIFIED' && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: smtpStatus === 'CONNECTED' ? '#059669' : '#dc2626' }}>
                  Status: {smtpStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Architecture & DB Compliance */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={20} color="#8b5cf6" />
              <h3 className="card-title">Database & DBeaver Compliance</h3>
            </div>
          </div>

          <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
            <p>Database: <strong>ai_group_attendance</strong> (MySQL InnoDB utf8mb4)</p>
            <p>Node.js Connector: <strong>mysql2/promise</strong> with pooled connections</p>
            <p>SMS Status: <strong>Completely Removed</strong> (no sms_logs, no sms_sent columns)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
