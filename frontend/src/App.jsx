import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentManagement from './pages/admin/StudentManagement';
import TeacherManagement from './pages/admin/TeacherManagement';
import ClassManagement from './pages/admin/ClassManagement';
import SubjectManagement from './pages/admin/SubjectManagement';
import AttendanceManagement from './pages/admin/AttendanceManagement';
import UnknownFacesPage from './pages/admin/UnknownFacesPage';
import ReportsPage from './pages/admin/ReportsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import SettingsPage from './pages/admin/SettingsPage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import CaptureAttendancePage from './pages/teacher/CaptureAttendancePage';
import TeacherClassesPage from './pages/teacher/TeacherClassesPage';
import TeacherSubjectsPage from './pages/teacher/TeacherSubjectsPage';
import TeacherAttendanceHistory from './pages/teacher/TeacherAttendanceHistory';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import FaceRegistrationPage from './pages/student/FaceRegistrationPage';
import StudentProfilePage from './pages/student/StudentProfilePage';
import SubjectAttendancePage from './pages/student/SubjectAttendancePage';
import AttendanceHistoryPage from './pages/student/AttendanceHistoryPage';

// Common Pages
import NotificationsPage from './pages/common/NotificationsPage';
import ProfilePage from './pages/common/ProfilePage';
import ChangePasswordPage from './pages/common/ChangePasswordPage';
import NotFoundPage from './pages/common/NotFoundPage';

// Route Protection Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#059669', fontWeight: 600 }}>Loading system session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's authorized home
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
    if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Root Dispatcher
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
  if (user?.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Routes inside Main App Layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Admin Section */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <StudentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TeacherManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ClassManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SubjectManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AttendanceManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/unknown-faces"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UnknownFacesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Teacher Section */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/capture"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <CaptureAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classes"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <TeacherClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/subjects"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <TeacherSubjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/history"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <TeacherAttendanceHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/reports"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Student Section */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/face-register"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
              <FaceRegistrationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/subjects"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <SubjectAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/history"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <AttendanceHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Shared / Common Routes */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/student/change-password" element={<ChangePasswordPage />} />
        <Route path="/teacher/change-password" element={<ChangePasswordPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
