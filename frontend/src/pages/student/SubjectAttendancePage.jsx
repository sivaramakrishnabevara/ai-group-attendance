import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SubjectAttendancePage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await api.get('/students/dashboard');
        if (res.data?.success) {
          setSubjects(res.data.data.subjectBreakdown || []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, []);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subject-Wise Attendance</h1>
          <p className="page-subtitle">Track lecture attendance rates and compliance across each enrolled course subject.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="52px" />
      ) : subjects.length === 0 ? (
        <EmptyState title="No Course Records" message="No curriculum attendance marked yet." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {subjects.map((sub) => {
            const pct = Number(sub.percentage || 100);
            const isLow = pct < 75;
            return (
              <div key={sub.subject_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BookOpen size={20} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                    {sub.subject_code}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{sub.subject_name}</h3>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Attendance Rate:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isLow ? '#dc2626' : '#059669' }}>
                    {pct}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Present: <strong>{sub.present_count}</strong></span>
                  <span>Absent: <strong>{sub.absent_count || (sub.total_sessions - sub.present_count)}</strong></span>
                  <span>Total Lectures: <strong>{sub.total_sessions}</strong></span>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {isLow ? (
                    <Badge status="ERROR" label="LOW ATTENDANCE WARNING" />
                  ) : (
                    <Badge status="SUCCESS" label="ATTENDANCE REQUIREMENT MET" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
