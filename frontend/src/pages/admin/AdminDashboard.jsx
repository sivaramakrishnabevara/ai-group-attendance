import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.data && res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Loading system intelligence and attendance telemetry...</p>
          </div>
        </div>
        <LoadingSkeleton rows={4} height="80px" style={{ marginBottom: '1.5rem' }} />
        <LoadingSkeleton rows={6} height="40px" />
      </div>
    );
  }

  const counts = data?.counts || {};
  const today = data?.todayAttendance || { present: 0, absent: 0, unknown: 0, total_marked: 0 };
  const lowAttendance = data?.lowAttendanceStudents || [];
  const recentSessions = data?.recentSessions || [];
  const recentActivity = data?.recentActivity || [];

  // Attendance pie data
  const pieData = [
    { name: 'Present', value: Number(today.present || 0), color: '#10b981' },
    { name: 'Absent', value: Number(today.absent || 0), color: '#ef4444' },
    { name: 'Unknown', value: Number(today.unknown || 0), color: '#f59e0b' }
  ];

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Overview</h1>
          <p className="page-subtitle">Real-time biometric attendance metrics, enrollment telemetry, and alerts.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/attendance" className="btn btn-secondary btn-sm">
            <CalendarCheck size={16} /> Manage Sessions
          </Link>
          <Link to="/admin/reports" className="btn btn-primary btn-sm">
            <TrendingUp size={16} /> Export Reports
          </Link>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Students"
          value={counts.total_students || 0}
          icon={GraduationCap}
          color="#059669"
          bgLight="#ecfdf5"
        />
        <StatCard
          label="Total Teachers"
          value={counts.total_teachers || 0}
          icon={Users}
          color="#2563eb"
          bgLight="#eff6ff"
        />
        <StatCard
          label="Active Classes"
          value={counts.total_classes || 0}
          icon={School}
          color="#8b5cf6"
          bgLight="#f5f3ff"
        />
        <StatCard
          label="Subjects"
          value={counts.total_subjects || 0}
          icon={BookOpen}
          color="#0891b2"
          bgLight="#ecfeff"
        />
      </div>

      {/* Today Attendance Highlights Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard
          label="Today's Sessions"
          value={today.sessions_count || 0}
          icon={CalendarCheck}
          color="#059669"
          bgLight="#ecfdf5"
        />
        <StatCard
          label="Present Students"
          value={today.present || 0}
          icon={CheckCircle2}
          color="#10b981"
          bgLight="#ecfdf5"
        />
        <StatCard
          label="Absent Students"
          value={today.absent || 0}
          icon={XCircle}
          color="#ef4444"
          bgLight="#fef2f2"
        />
        <StatCard
          label="Unknown Faces"
          value={today.unknown || 0}
          icon={HelpCircle}
          color="#f59e0b"
          bgLight="#fffbeb"
        />
      </div>

      {/* Charts & Analytics Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Attendance Distribution Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today's Attendance Ratio</h3>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>YuNet + SFace Recognitions</span>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            {today.total_marked > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No Attendance Marked Today" message="Start a classroom session in Teacher mode to see real-time data." />
            )}
          </div>
        </div>

        {/* Biometric Engine Metrics Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">AI Biometric Engine Telemetry</h3>
            <Badge status="ACTIVE" label="YuNet + SFace" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Face Detector</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>OpenCV YuNet ONNX (Multi-scale)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Feature Extractor</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>SFace 128D Normalized Embeddings</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Face Matcher</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>Cosine Similarity (Threshold: 0.36)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Enrollment Policy</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>5 Valid Multi-angle Facial Vectors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Low Attendance Alert + Recent Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Low Attendance Students Alert Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <h3 className="card-title">Low Attendance Alerts (&lt; 75%)</h3>
            </div>
            <Link to="/admin/reports?type=low" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
              View All
            </Link>
          </div>

          {lowAttendance.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#059669', fontWeight: 600, background: '#ecfdf5', borderRadius: '8px' }}>
              All enrolled students maintain attendance above their required threshold.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Attendance %</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowAttendance.slice(0, 5).map((stu) => (
                    <tr key={stu.student_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{stu.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stu.student_code} ({stu.roll_number})</div>
                      </td>
                      <td>{stu.class_name} - {stu.section}</td>
                      <td>
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>
                          {stu.attendance_percentage}%
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/reports?studentId=${stu.student_id}`} className="btn btn-secondary btn-sm">
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Attendance Sessions Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Attendance Sessions</h3>
            <Link to="/admin/attendance" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
              View All
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <EmptyState title="No Sessions Yet" message="No attendance sessions recorded yet." />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date / Subject</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>P / A / U</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.slice(0, 5).map((ses) => (
                    <tr key={ses.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ses.subject_name || ses.subject_code}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(ses.session_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>{ses.class_name} - {ses.section}</td>
                      <td>
                        <Badge status={ses.status} />
                      </td>
                      <td>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{ses.total_present}</span> /{' '}
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>{ses.total_absent}</span> /{' '}
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{ses.total_unknown}</span>
                      </td>
                      <td>
                        <Link to={`/admin/attendance?sessionId=${ses.id}`} className="btn btn-secondary btn-sm">
                          Review
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

      {/* Recent Activity Audit Trail */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#2563eb" />
            <h3 className="card-title">Live System Activity & Audit Trail</h3>
          </div>
          <Link to="/admin/audit-logs" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
            Full Audit Logs
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <EmptyState title="No Activity" message="System events and security logs will appear here." />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.slice(0, 6).map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <Badge status="INFO" label={log.action} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.full_name || 'System'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.email || 'N/A'}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#334155' }}>
                      {log.description}
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
