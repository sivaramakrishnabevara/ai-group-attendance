import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { User, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setLoadingInfo(true);
    try {
      const res = await api.put('/auth/profile', { fullName, phone });
      if (res.data?.success) {
        updateUserProfile({ full_name: fullName, phone });
        showSuccess('Profile details updated successfully.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 4) {
      showError('New password must be at least 4 characters (e.g. 1234).');
      return;
    }
    setLoadingPass(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data?.success) {
        showSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '780px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Account & Security</h1>
          <p className="page-subtitle">Manage personal profile information and update credentials.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Personal Profile</h3>
            <Badge status={user?.role} label={user?.role} />
          </div>

          <form onSubmit={handleUpdateInfo}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Read-only)</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-sm" disabled={loadingInfo}>
              {loadingInfo ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Change Password</h3>
          </div>

          <form onSubmit={handleUpdatePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-sm" disabled={loadingPass}>
              {loadingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
