import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { BookOpen, Camera } from 'lucide-react';

export default function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        let list = [];
        try {
          const res = await api.get('/teachers/my-subjects');
          if (res.data?.success && res.data.data?.length > 0) list = res.data.data;
        } catch {}

        if (list.length === 0) {
          const resAll = await api.get('/subjects');
          if (resAll.data?.success) list = resAll.data.data;
        }
        setSubjects(list);
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
          <h1 className="page-title">My Assigned Subjects</h1>
          <p className="page-subtitle">Courses under your instructional syllabus and grading curriculum.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="52px" />
      ) : subjects.length === 0 ? (
        <EmptyState title="No Assigned Subjects" message="You have no courses mapped to your faculty profile." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {subjects.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{s.subject_name}</h3>
                  <div style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: '#059669', fontWeight: 600 }}>
                    {s.subject_code}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                {s.description || 'Curriculum course with full biometric session tracking.'}
              </p>

              <Link to={`/teacher/capture?subjectId=${s.id}`} className="btn btn-secondary btn-sm" style={{ marginTop: 'auto' }}>
                <Camera size={14} /> Open Attendance For Course
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
