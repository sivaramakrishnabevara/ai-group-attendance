import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get('/students/dashboard');
        if (res.data?.success) setData(res.data.data);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page-wrapper">
        <LoadingSkeleton rows={4} height="80px" style={{ marginBottom: '1.5rem' }} />
        <LoadingSkeleton rows={5} height="50px" />
      </div>
    );
  }

  const student = data?.student || {};
  const stats = data?.attendanceStats || { total_sessions: 0, present_count: 0, absent_count: 0, late_count: 0, percentage: 100 };
  const recentAttendance = data?.recentAttendance || [];
  const subjectBreakdown = data?.subjectBreakdown || [];

  const percentage = Number(stats.percentage || 100);
  const threshold = Number(student.low_attendance_threshold || 75);
  const isLowAttendance = percentage < threshold;
  const isFaceEnrolled = student.registration_status === 'COMPLETED';

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Attendance Portal</h1>
          <p className="page-subtitle">Welcome back, {student.full_name}! Track your curriculum attendance and biometric face profile.</p>
        </div>
        {!isFaceEnrolled && (
          <Link to="/student/face-register" className="btn btn-primary">
            <Camera size={18} /> Complete 5-Pose Face Registration
          </Link>
        )}
      </div>

      {/* Biometric Enrollment Required Banner */}
      {!isFaceEnrolled && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Camera size={24} color="#d97706" />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e' }}>
                Biometric Face Registration Pending ({student.images_count || 0}/5 Images)
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#b45309' }}>
                Enroll all 5 facial poses to be automatically recognized in classroom attendance sessions.
              </div>
            </div>
          </div>
          <Link to="/student/face-register" className="btn btn-primary btn-sm">
            Enroll Now <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Low Attendance Warning Alert Banner */}
      {isLowAttendance && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1.5rem'
        }}>
          <AlertTriangle size={28} color="#dc2626" />
          <div>
            <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '1rem' }}>
              LOW ATTENDANCE WARNING
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#b91c1c' }}>
              Your current attendance rate ({percentage}%) has dropped below the mandatory threshold ({threshold}%). Please attend upcoming lectures to maintain examination eligibility.
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          label="Overall Attendance"
          value={`${percentage}%`}
          icon={CheckCircle2}
          color={isLowAttendance ? '#dc2626' : '#059669'}
          bgLight={isLowAttendance ? '#fef2f2' : '#ecfdf5'}
          subtitle={`Threshold: ${threshold}%`}
        />
        <StatCard
          label="Total Classes Held"
          value={stats.total_sessions}
          icon={CalendarCheck}
          color="#2563eb"
          bgLight="#eff6ff"
        />
        <StatCard
          label="Classes Present"
          value={stats.present_count}
          icon={CheckCircle2}
          color="#10b981"
          bgLight="#ecfdf5"
        />
        <StatCard
          label="Classes Absent"
          value={stats.absent_count}
          icon={XCircle}
          color="#ef4444"
          bgLight="#fef2f2"
        />
      </div>

      {/* Subject-Wise Breakdown Preview */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <h3 className="card-title">Subject Attendance Overview</h3>
          <Link to="/student/subjects" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
            View Full Breakdown
          </Link>
        </div>

        {subjectBreakdown.length === 0 ? (
          <EmptyState title="No Subject Data" message="No curriculum attendance marked for your subjects yet." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {subjectBreakdown.map((sub) => {
              const subPct = Number(sub.percentage || 100);
              const subLow = subPct < threshold;
              return (
                <div key={sub.subject_id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>{sub.subject_name}</div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#059669', marginBottom: '8px' }}>
                    {sub.subject_code}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Attendance:</span>
                    <span style={{ fontWeight: 800, color: subLow ? '#ef4444' : '#059669' }}>{subPct}%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {sub.present_count} / {sub.total_sessions} Classes Attended
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Attendance Logs */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Attendance Records</h3>
          <Link to="/student/history" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
            View All History
          </Link>
        </div>

        {recentAttendance.length === 0 ? (
          <EmptyState title="No Attendance Logs" message="You have no recorded attendance sessions yet." />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Similarity Match</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((rec) => (
                  <tr key={rec.id}>
                    <td>{new Date(rec.session_date).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rec.subject_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.subject_code}</div>
                    </td>
                    <td><Badge status={rec.status} /></td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: rec.recognition_method === 'AI' ? '#059669' : '#64748b' }}>
                        {rec.recognition_method}
                      </span>
                    </td>
                    <td>
                      {rec.similarity_score ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669' }}>
                          {(Number(rec.similarity_score) * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
