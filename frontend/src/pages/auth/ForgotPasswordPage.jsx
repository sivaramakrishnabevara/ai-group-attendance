import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      showSuccess('If an account exists with this email, a reset link has been dispatched.');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '24px',
      padding: '2.5rem 2rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
      width: '100%',
      maxWidth: '430px',
      boxSizing: 'border-box'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '1.25rem' }}>
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Reset your password
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Enter your registered email address and we'll send a secure password reset token.
        </p>
      </div>

      {submitted ? (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <CheckCircle2 size={40} color="#059669" style={{ margin: '0 auto 0.75rem' }} />
          <h4 style={{ fontWeight: 700, color: '#065f46', marginBottom: '0.25rem' }}>Check your email</h4>
          <p style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '1.25rem' }}>
            We have sent password reset instructions to <strong>{email}</strong>.
          </p>
          <Link to="/login" className="btn btn-primary btn-sm">
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Registered Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="name@aigroup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Sending link...' : 'Send Password Reset Link'}
          </button>
        </form>
      )}
    </div>
  );
}
