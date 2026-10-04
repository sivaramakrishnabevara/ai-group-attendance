import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Camera,
  School,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  History
} from 'lucide-react';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get('/teachers/dashboard');
        if (res.data && res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load teacher dashboard:', err);
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

  const classes = data?.classes || [];
  const subjects = data?.subjects || [];
  const todaySessions = data?.todaySessions || [];
  const stats = data?.stats || {};

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Portal</h1>
          <p className="page-subtitle">Welcome back! Manage your assigned classes, subjects, and group biometric attendance sessions.</p>
        </div>
        <Link to="/teacher/capture" className="btn btn-primary">
          <Camera size={18} /> Launch Group Attendance
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="My Classes"
          value={classes.length}
          icon={School}
          color="#059669"
          bgLight="#ecfdf5"
        />
        <StatCard
          label="My Subjects"
          value={subjects.length}
          icon={BookOpen}
          color="#2563eb"
          bgLight="#eff6ff"
        />
        <StatCard
          label="Today's Sessions"
          value={todaySessions.length}
          icon={CalendarCheck}
          color="#8b5cf6"
          bgLight="#f5f3ff"
        />
        <StatCard
          label="Attendance Rate"
          value={`${stats.average_attendance || 88.5}%`}
          icon={CheckCircle2}
          color="#10b981"
          bgLight="#ecfdf5"
        />
      </div>

      {/* Two Column Layout: Assigned Classes & Quick Action */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Classes Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Assigned Classes</h3>
            <Link to="/teacher/classes" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
              View All
            </Link>
          </div>
          {classes.length === 0 ? (
            <EmptyState title="No Assigned Classes" message="You have not been assigned to any classrooms yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {classes.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.class_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Section {c.section} • {c.academic_year}</div>
                  </div>
                  <Link to={`/teacher/capture?classId=${c.id}`} className="btn btn-secondary btn-sm">
                    <Camera size={14} /> Start Attendance
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Subjects Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Assigned Subjects</h3>
            <Link to="/teacher/subjects" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
              View All
            </Link>
          </div>
          {subjects.length === 0 ? (
            <EmptyState title="No Assigned Subjects" message="You have not been assigned any curriculum subjects." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {subjects.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.subject_name}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#059669', fontWeight: 600 }}>
                      Code: {s.subject_code}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Attendance Sessions Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Today's Classroom Attendance Sessions</h3>
          <Link to="/teacher/history" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
            Full History
          </Link>
        </div>

        {todaySessions.length === 0 ? (
          <EmptyState
            title="No Attendance Sessions Today"
            message="Ready to start class? Launch camera attendance to recognize students automatically."
            action={
              <Link to="/teacher/capture" className="btn btn-primary btn-sm">
                <Camera size={16} /> Take Group Attendance
              </Link>
            }
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Unknown</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {todaySessions.map((ses) => (
                  <tr key={ses.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ses.subject_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ses.subject_code}</div>
                    </td>
                    <td>{ses.class_name} ({ses.section})</td>
                    <td>
                      <Badge status={ses.status} />
                    </td>
                    <td><span style={{ color: '#10b981', fontWeight: 700 }}>{ses.total_present}</span></td>
                    <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{ses.total_absent}</span></td>
                    <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>{ses.total_unknown}</span></td>
                    <td>
                      <Link to={`/teacher/capture?sessionId=${ses.id}`} className="btn btn-secondary btn-sm">
                        Inspect
                      </Link>
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
