import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { History, Calendar, CheckCircle2 } from 'lucide-react';

export default function AttendanceHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await api.get('/students/dashboard');
        if (res.data?.success) {
          setHistory(res.data.data.recentAttendance || []);
        }
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
          <h1 className="page-title">Personal Attendance Logs</h1>
          <p className="page-subtitle">Chronological record of all classroom attendance sessions, biometric match scores, and timestamps.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} height="52px" />
      ) : history.length === 0 ? (
        <EmptyState title="No Attendance Logs" message="You have no recorded attendance sessions yet." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Recognition Method</th>
                <th>AI Similarity Score</th>
                <th>Marked Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((rec) => (
                <tr key={rec.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(rec.session_date).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{rec.subject_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.subject_code}</div>
                  </td>
                  <td>
                    <Badge status={rec.status} />
                  </td>
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
  );
}
