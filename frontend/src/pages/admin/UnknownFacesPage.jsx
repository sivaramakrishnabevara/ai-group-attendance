import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { HelpCircle, UserCheck, EyeOff, Trash2, CheckCircle2 } from 'lucide-react';

export default function UnknownFacesPage() {
  const [unknownFaces, setUnknownFaces] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activeFace, setActiveFace] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const { showSuccess, showError } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resU, resS] = await Promise.all([
        api.get('/unknown-faces', { params: { status: statusFilter || undefined } }),
        api.get('/students')
      ]);
      if (resU.data && resU.data.success) setUnknownFaces(resU.data.data);
      if (resS.data && resS.data.success) setStudents(resS.data.data);
    } catch (err) {
      showError('Failed to fetch unknown faces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleOpenAssign = (face) => {
    setActiveFace(face);
    setSelectedStudentId('');
    setAssignNotes('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedStudentId || !activeFace) return;
    try {
      await api.post(`/unknown-faces/${activeFace.id}/assign`, {
        studentId: selectedStudentId,
        notes: assignNotes
      });
      showSuccess('Unknown face assigned to student. Attendance updated.');
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to assign face.');
    }
  };

  const handleIgnore = async (id) => {
    try {
      await api.post(`/unknown-faces/${id}/ignore`);
      showSuccess('Face marked as ignored.');
      fetchData();
    } catch (err) {
      showError('Failed to update face status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this unknown face crop record?')) return;
    try {
      await api.delete(`/unknown-faces/${id}`);
      showSuccess('Record deleted.');
      fetchData();
    } catch (err) {
      showError('Failed to delete unknown face.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Unknown Faces Resolution</h1>
          <p className="page-subtitle">Review unrecognized faces captured during group classroom sessions and map them to students.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING (Action Required)</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IGNORED">IGNORED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="70px" />
      ) : unknownFaces.length === 0 ? (
        <EmptyState
          title="No Unknown Faces"
          message="There are no unresolved unknown faces requiring review at this time."
          icon={CheckCircle2}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {unknownFaces.map((face) => (
            <div key={face.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                <img
                  src={face.image_path}
                  alt="Unknown Face Crop"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <Badge status={face.status} size="sm" />
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                  {face.subject_name || 'Classroom Session'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {face.class_name} ({face.section}) • {new Date(face.session_date).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Best Similarity: {face.similarity_score ? `${(face.similarity_score * 100).toFixed(1)}%` : 'No Match'}
                </div>
                {face.assigned_student_name && (
                  <div style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                    Assigned to: {face.assigned_student_name}
                  </div>
                )}
              </div>

              {face.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => handleOpenAssign(face)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <UserCheck size={14} /> Assign
                  </button>
                  <button
                    onClick={() => handleIgnore(face.id)}
                    className="btn btn-secondary btn-sm"
                    title="Ignore"
                  >
                    <EyeOff size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(face.id)}
                    className="btn btn-danger btn-sm"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Face Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Unknown Face to Enrolled Student"
        footer={
          <>
            <button onClick={() => setAssignModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleConfirmAssign} disabled={!selectedStudentId} className="btn btn-primary btn-sm">
              Confirm Assignment
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeFace && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' }}>
              <img
                src={activeFace.image_path}
                alt="Face"
                style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{activeFace.class_name} ({activeFace.section})</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {new Date(activeFace.session_date).toLocaleDateString()}</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Select Student *</label>
            <select
              className="form-select"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">Choose matching student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.roll_number || s.student_id}) - {s.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Audit Notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="e.g. Verified manually by instructor via classroom desk seat."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
