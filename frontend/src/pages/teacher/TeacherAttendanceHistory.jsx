import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { History, Eye, Calendar } from 'lucide-react';

export default function TeacherAttendanceHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        let list = [];
        try {
          const res = await api.get('/teachers/my-sessions');
          if (res.data?.success && res.data.data?.length > 0) list = res.data.data;
        } catch {}

        if (list.length === 0) {
          const resAll = await api.get('/attendance/sessions');
          if (resAll.data?.success) list = resAll.data.data;
        }
        setSessions(list);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance History & Sessions</h1>
          <p className="page-subtitle">Past attendance captures, AI verification status, and administrative approval records.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} height="52px" />
      ) : sessions.length === 0 ? (
        <EmptyState title="No Attendance History" message="You have not submitted any attendance sessions yet." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Class Cohort</th>
                <th>Status</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Unknown</th>
                <th>Total Enrolled</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((ses) => (
                <tr key={ses.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(ses.session_date).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ses.subject_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ses.subject_code}</div>
                  </td>
                  <td>{ses.class_name} ({ses.section})</td>
                  <td>
                    <Badge status={ses.status} />
                  </td>
                  <td><span style={{ color: '#059669', fontWeight: 700 }}>{ses.total_present}</span></td>
                  <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{ses.total_absent}</span></td>
                  <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>{ses.total_unknown}</span></td>
                  <td>{ses.total_students}</td>
                  <td>
                    <Link to={`/teacher/capture?sessionId=${ses.id}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px' }}>
                      <Eye size={14} /> Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
