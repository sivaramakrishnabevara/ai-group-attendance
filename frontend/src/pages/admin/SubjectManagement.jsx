import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { BookOpen, Plus, Edit2, Trash2, Search } from 'lucide-react';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    description: ''
  });

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subjects', { params: { search } });
      if (res.data && res.data.success) {
        setSubjects(res.data.data);
      }
    } catch (err) {
      showError('Failed to fetch subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setFormData({
      subjectCode: '',
      subjectName: '',
      description: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSubject(s);
    setFormData({
      subjectCode: s.subject_code,
      subjectName: s.subject_name,
      description: s.description || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, formData);
        showSuccess('Subject details updated.');
      } else {
        await api.post('/subjects', formData);
        showSuccess('New subject registered.');
      }
      setModalOpen(false);
      fetchSubjects();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save subject.');
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate subject ${name}?`)) return;
    try {
      await api.delete(`/subjects/${id}`);
      showSuccess(`Subject ${name} deactivated.`);
      fetchSubjects();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete subject.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subject Management</h1>
          <p className="page-subtitle">Configure curriculum courses, subject codes, and faculty assignments.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          <Plus size={18} /> Add New Subject
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-item" style={{ flex: 2 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search subjects by code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="52px" />
      ) : subjects.length === 0 ? (
        <EmptyState title="No Subjects Found" message="No curriculum subjects registered yet." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Title</th>
                <th>Description</th>
                <th>Assigned Faculty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669' }}>
                      {s.subject_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.subject_name}</div>
                  </td>
                  <td style={{ maxWidth: '320px', color: '#64748b' }}>
                    {s.description || 'No description provided.'}
                  </td>
                  <td>
                    <span>{s.teacher_count || 0} Faculty</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(s.id, s.subject_name)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? 'Edit Subject Details' : 'Create Subject'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSave} className="btn btn-primary btn-sm">Save Subject</button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Subject Code *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.subjectCode}
              onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
              placeholder="e.g. AI501"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subject Title *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.subjectName}
              onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
              placeholder="e.g. Artificial Intelligence"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Course description and syllabus overview..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
