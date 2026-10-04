import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  User,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Role selection state: null | 'ADMIN' | 'TEACHER' | 'STUDENT'
  const [selectedRole, setSelectedRole] = useState(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle clicking on one of the 3 role buttons on initial screen
  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setErrorMsg('');

    // Pre-populate with default simple credentials as requested by user
    if (role === 'ADMIN') {
      setIdentifier('admin');
      setPassword('1234');
    } else if (role === 'TEACHER') {
      setIdentifier('EMP001');
      setPassword('1234');
    } else if (role === 'STUDENT') {
      setIdentifier('21AI01');
      setPassword('1234');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please enter both identifier and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const user = await login(identifier, password);
      showSuccess(`Welcome back, ${user.full_name}!`);

      // Role-based redirect
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else if (user.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Login failed. Please verify credentials.';
      setErrorMsg(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = () => {
    switch (selectedRole) {
      case 'ADMIN':
        return {
          title: 'Admin Portal',
          label: 'Admin Username / Email',
          placeholder: 'admin or admin@attendance.com',
          defaultId: 'admin',
          bgGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#059669',
          icon: <User size={22} color="#ffffff" />
        };
      case 'TEACHER':
        return {
          title: 'Faculty / Teacher Portal',
          label: 'Employee Code / ID',
          placeholder: 'EMP001',
          defaultId: 'EMP001',
          bgGradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
          color: '#1d4ed8',
          icon: <GraduationCap size={22} color="#ffffff" />
        };
      case 'STUDENT':
        return {
          title: 'Student Portal',
          label: 'Roll Number / Student ID',
          placeholder: '21AI01',
          defaultId: '21AI01',
          bgGradient: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
          color: '#4338ca',
          icon: <User size={22} color="#ffffff" />
        };
      default:
        return null;
    }
  };

  const roleConfig = getRoleConfig();

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        width: '100%',
        maxWidth: '430px',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      {/* SCREEN 1: Role Selection Menu (Identical to reference screenshot) */}
      {!selectedRole ? (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                marginBottom: '0.4rem'
              }}
            >
              Login to Your Account
            </h2>
            <p style={{ fontSize: '0.925rem', color: '#64748b', fontWeight: 500, margin: 0 }}>
              Select your role to continue
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Admin Login Button (Green) */}
            <button
              type="button"
              onClick={() => handleSelectRole('ADMIN')}
              className="role-login-btn admin-btn"
            >
              <div className="role-icon-circle">
                <User size={20} color="#ffffff" />
              </div>
              <span className="role-btn-text">Admin Login</span>
              <ArrowRight size={20} color="#ffffff" className="role-arrow" />
            </button>

            {/* Teacher Login Button (Blue) */}
            <button
              type="button"
              onClick={() => handleSelectRole('TEACHER')}
              className="role-login-btn teacher-btn"
            >
              <div className="role-icon-circle">
                <GraduationCap size={20} color="#ffffff" />
              </div>
              <span className="role-btn-text">Teacher Login</span>
              <ArrowRight size={20} color="#ffffff" className="role-arrow" />
            </button>

            {/* Student Login Button (Purple) */}
            <button
              type="button"
              onClick={() => handleSelectRole('STUDENT')}
              className="role-login-btn student-btn"
            >
              <div className="role-icon-circle">
                <User size={20} color="#ffffff" />
              </div>
              <span className="role-btn-text">Student Login</span>
              <ArrowRight size={20} color="#ffffff" className="role-arrow" />
            </button>
          </div>

          {/* Footer branding */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '2.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.8125rem',
              color: '#94a3b8',
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}
          >
            AI Powered &nbsp;|&nbsp; Secure &nbsp;|&nbsp; Reliable
          </div>
        </div>
      ) : (
        /* SCREEN 2: Role-Specific Sign In Form */
        <div>
          {/* Back button & Role Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#64748b',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '4px 0'
              }}
            >
              <ArrowLeft size={16} /> Back to roles
            </button>

            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: `${roleConfig.color}15`,
                color: roleConfig.color,
                letterSpacing: '0.04em'
              }}
            >
              {selectedRole} PORTAL
            </span>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                marginBottom: '0.35rem'
              }}
            >
              {roleConfig.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              Sign in with your credentials to continue
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                fontWeight: 500
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label
                className="form-label"
                htmlFor="identifier"
                style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
              >
                {roleConfig.label}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '40px', height: '46px', borderRadius: '10px' }}
                  placeholder={roleConfig.placeholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}
              >
                <label
                  className="form-label"
                  htmlFor="password"
                  style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.75rem', fontWeight: 600, color: roleConfig.color }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    paddingLeft: '40px',
                    paddingRight: '40px',
                    height: '46px',
                    borderRadius: '10px'
                  }}
                  placeholder="Password (e.g. 1234)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials Pill */}
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#64748b'
              }}
            >
              <span>
                Default Login: <strong>{roleConfig.defaultId}</strong> / <strong>1234</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIdentifier(roleConfig.defaultId);
                  setPassword('1234');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: roleConfig.color,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Auto-fill
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '12px',
                border: 'none',
                background: roleConfig.bgGradient,
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: `0 8px 20px -4px ${roleConfig.color}66`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In as {selectedRole}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Button styles for hover effects */}
      <style>{`
        .role-login-btn {
          width: 100%;
          height: 60px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0 1.25rem;
          color: #ffffff;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          position: relative;
        }
        .role-login-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.05);
        }
        .admin-btn {
          background: #059669;
          box-shadow: 0 6px 16px -2px rgba(5, 150, 105, 0.4);
        }
        .admin-btn:hover {
          box-shadow: 0 10px 22px -2px rgba(5, 150, 105, 0.5);
        }
        .teacher-btn {
          background: #1d4ed8;
          box-shadow: 0 6px 16px -2px rgba(29, 78, 216, 0.4);
        }
        .teacher-btn:hover {
          box-shadow: 0 10px 22px -2px rgba(29, 78, 216, 0.5);
        }
        .student-btn {
          background: #4338ca;
          box-shadow: 0 6px 16px -2px rgba(67, 56, 202, 0.4);
        }
        .student-btn:hover {
          box-shadow: 0 10px 22px -2px rgba(67, 56, 202, 0.5);
        }
        .role-icon-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
        }
        .role-btn-text {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          flex: 1;
          text-align: left;
        }
        .role-arrow {
          transition: transform 0.2s ease;
        }
        .role-login-btn:hover .role-arrow {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}
