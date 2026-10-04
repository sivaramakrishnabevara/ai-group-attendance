import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  Camera,
  History,
  FileBarChart,
  Bell,
  Settings,
  ShieldAlert,
  UserCheck,
  User,
  LogOut,
  CalendarCheck,
  HelpCircle,
  Clock,
  KeyRound
} from 'lucide-react';

export default function Sidebar({ isOpen, onCloseMobile }) {
  const { user, logout, isAdmin, isTeacher, isStudent } = useAuth();

  let navItems = [];

  if (isAdmin) {
    navItems = [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/students', label: 'Students', icon: GraduationCap },
      { to: '/admin/teachers', label: 'Teachers', icon: Users },
      { to: '/admin/classes', label: 'Classes', icon: School },
      { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
      { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/admin/unknown-faces', label: 'Unknown Faces', icon: HelpCircle },
      { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
      { to: '/profile', label: 'Profile', icon: User }
    ];
  } else if (isTeacher) {
    navItems = [
      { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/teacher/capture', label: 'Capture Attendance', icon: Camera },
      { to: '/teacher/classes', label: 'My Classes', icon: School },
      { to: '/teacher/subjects', label: 'My Subjects', icon: BookOpen },
      { to: '/teacher/history', label: 'Attendance History', icon: History },
      { to: '/teacher/reports', label: 'Reports', icon: FileBarChart },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/teacher/change-password', label: 'Change Password', icon: KeyRound },
      { to: '/profile', label: 'Profile', icon: User }
    ];
  } else if (isStudent) {
    navItems = [
      { to: '/student/dashboard', label: 'My Attendance', icon: LayoutDashboard },
      { to: '/student/subjects', label: 'Subject Breakdown', icon: BookOpen },
      { to: '/student/history', label: 'Attendance Logs', icon: History },
      { to: '/student/change-password', label: 'Change Password', icon: KeyRound }
    ];
  }

  const handleLinkClick = () => {
    if (window.innerWidth <= 768 && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`sidebar ${isOpen ? 'mobile-open' : ''}`}
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: 'var(--shadow-xs)'
      }}
    >
      {/* Brand Header */}
      <div style={{
        height: 'var(--header-height)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
        }}>
          <UserCheck size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', lineHeight: 1.1 }}>
            AI Attendance
          </div>
          <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
            YuNet + SFace Biometrics
          </div>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div style={{
        margin: '1rem 1rem 0.5rem',
        padding: '0.625rem 0.875rem',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Active Role:</span>
        <span style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '9999px',
          background: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0'
        }}>
          {user?.role || 'GUEST'}
        </span>
      </div>

      {/* Navigation List */}
      <nav style={{
        flex: 1,
        padding: '0.75rem 1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleLinkClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.875rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#065f46' : '#475569',
                backgroundColor: isActive ? '#ecfdf5' : 'transparent',
                borderLeft: isActive ? '3px solid #059669' : '3px solid transparent',
                transition: 'all 150ms ease'
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-light)'
      }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.625rem',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'background 150ms'
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
