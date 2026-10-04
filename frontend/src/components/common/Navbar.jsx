import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Menu, User, LogOut, CheckCircle, AlertTriangle, ShieldCheck, KeyRound } from 'lucide-react';
import api from '../../services/api';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState('checking');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.get('/health');
        if (res.data.database === 'OK' && res.data.ai_service === 'OK') {
          setHealthStatus('healthy');
        } else {
          setHealthStatus('degraded');
        }
      } catch {
        setHealthStatus('offline');
      }
    }

    async function fetchUnreadNotifications() {
      try {
        const res = await api.get('/notifications?unreadOnly=true');
        if (res.data && res.data.data) {
          setUnreadNotifications(res.data.data.length);
        }
      } catch {
        // ignore
      }
    }

    checkHealth();
    fetchUnreadNotifications();

    const interval = setInterval(() => {
      checkHealth();
      fetchUnreadNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-xs)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '6px'
          }}
          aria-label="Toggle Navigation"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <img src="/logo.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
          <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            AI Attendance <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', background: '#ecfdf5', borderRadius: '4px', border: '1px solid #a7f3d0' }}>PRO</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* System Health Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: healthStatus === 'healthy' ? '#ecfdf5' : healthStatus === 'degraded' ? '#fffbeb' : '#fef2f2',
          color: healthStatus === 'healthy' ? '#065f46' : healthStatus === 'degraded' ? '#92400e' : '#991b1b',
          border: `1px solid ${healthStatus === 'healthy' ? '#a7f3d0' : healthStatus === 'degraded' ? '#fde68a' : '#fecaca'}`
        }}>
          {healthStatus === 'healthy' ? (
            <>
              <CheckCircle size={14} color="#059669" />
              <span>AI & DB Online</span>
            </>
          ) : healthStatus === 'degraded' ? (
            <>
              <AlertTriangle size={14} color="#d97706" />
              <span>Service Degraded</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} color="#dc2626" />
              <span>Backend Offline</span>
            </>
          )}
        </div>

        {/* Notifications Icon with Badge */}
        <Link
          to="/notifications"
          style={{
            position: 'relative',
            padding: '8px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '8px',
            transition: 'background 150ms'
          }}
          title="Notifications"
        >
          <Bell size={20} />
          {unreadNotifications > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.6875rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #ffffff'
            }}>
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Link>

        {/* User Profile Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-light)' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#059669',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.875rem'
          }}>
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
              {user?.full_name || 'User'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              {user?.role}
            </span>
          </div>

          <Link
            to={user?.role === 'STUDENT' ? '/student/change-password' : user?.role === 'TEACHER' ? '/teacher/change-password' : '/profile'}
            style={{
              padding: '6px',
              color: '#64748b',
              marginLeft: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px'
            }}
            title="Change Password"
          >
            <KeyRound size={18} />
          </Link>

          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#94a3b8',
              marginLeft: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px'
            }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
