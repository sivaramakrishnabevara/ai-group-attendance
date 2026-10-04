import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { School, Plus, Edit2, Trash2, Users } from 'lucide-react';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    className: '',
    section: 'A',
    academicYear: '2026-2027',
    semester: '5th Semester'
  });

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/classes');
      if (res.data && res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err) {
      showError('Failed to fetch class records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenCreate = () => {
    setEditingClass(null);
    setFormData({
      className: '',
      section: 'A',
      academicYear: '2026-2027',
      semester: '5th Semester'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingClass(c);
    setFormData({
      className: c.class_name,
      section: c.section,
      academicYear: c.academic_year,
      semester: c.semester || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, formData);
        showSuccess('Class details updated.');
      } else {
        await api.post('/classes', formData);
        showSuccess('New class created.');
      }
      setModalOpen(false);
      fetchClasses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save class.');
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate class ${name}?`)) return;
    try {
      await api.delete(`/classes/${id}`);
      showSuccess(`Class ${name} deactivated.`);
      fetchClasses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete class.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Management</h1>
          <p className="page-subtitle">Configure academic cohorts, sections, and classroom allocations.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          <Plus size={18} /> Add New Class
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="52px" />
      ) : classes.length === 0 ? (
        <EmptyState title="No Classes Found" message="No classroom sections created yet." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class Cohort</th>
                <th>Section</th>
                <th>Academic Year</th>
                <th>Semester</th>
                <th>Enrolled Students</th>
                <th>Assigned Faculty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.class_name}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px' }}>
                      Section {c.section}
                    </span>
                  </td>
                  <td>{c.academic_year}</td>
                  <td>{c.semester || '-'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Users size={14} color="#059669" /> {c.student_count || 0} Students
                    </span>
                  </td>
                  <td>
                    <span>{c.teacher_count || 0} Faculty</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(c.id, c.class_name)}
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
        title={editingClass ? 'Edit Class Details' : 'Create Academic Class'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSave} className="btn btn-primary btn-sm">Save Class</button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Class Name *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.className}
              onChange={(e) => setFormData({ ...formData, className: e.target.value })}
              placeholder="e.g. B.Tech AI & Data Science"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Section *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="A"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Academic Year *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              placeholder="2026-2027"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Semester</label>
            <input
              type="text"
              className="form-input"
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              placeholder="5th Semester"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
