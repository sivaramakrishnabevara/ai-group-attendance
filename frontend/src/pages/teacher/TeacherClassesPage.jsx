import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { School, Camera, Users } from 'lucide-react';

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      try {
        let list = [];
        try {
          const res = await api.get('/teachers/my-classes');
          if (res.data?.success && res.data.data?.length > 0) list = res.data.data;
        } catch {}

        if (list.length === 0) {
          const resAll = await api.get('/classes');
          if (resAll.data?.success) list = resAll.data.data;
        }
        setClasses(list);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, []);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Assigned Classes</h1>
          <p className="page-subtitle">Classrooms and student cohorts allocated for your curriculum instruction.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="52px" />
      ) : classes.length === 0 ? (
        <EmptyState title="No Assigned Classes" message="Your account is not currently assigned to any classroom sections." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {classes.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <School size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{c.class_name}</h3>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Section {c.section} • {c.academic_year}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Enrolled Roster:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{c.student_count || 0} Students</span>
              </div>

              <Link to={`/teacher/capture?classId=${c.id}`} className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }}>
                <Camera size={14} /> Start Group Attendance
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
