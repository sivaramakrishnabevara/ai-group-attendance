import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { UserPlus, Search, Edit2, Trash2, BookOpen, School, CheckSquare } from 'lucide-react';

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showSuccess, showError } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [assigningTeacher, setAssigningTeacher] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    employeeId: '',
    department: '',
    designation: ''
  });

  const [assignedClassIds, setAssignedClassIds] = useState([]);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resT, resC, resS] = await Promise.all([
        api.get('/teachers', { params: { search } }),
        api.get('/classes'),
        api.get('/subjects')
      ]);
      if (resT.data && resT.data.success) setTeachers(resT.data.data);
      if (resC.data && resC.data.success) setClasses(resC.data.data);
      if (resS.data && resS.data.success) setSubjects(resS.data.data);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to fetch teachers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      employeeId: `EMP${String(Date.now()).slice(-4)}`,
      department: 'Computer Science & AI',
      designation: 'Assistant Professor'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTeacher(t);
    setFormData({
      fullName: t.full_name || '',
      email: t.email || '',
      phone: t.phone || '',
      password: '',
      employeeId: t.employee_id || '',
      department: t.department || '',
      designation: t.designation || ''
    });
    setModalOpen(true);
  };

  const handleOpenAssign = async (t) => {
    setAssigningTeacher(t);
    try {
      const res = await api.get(`/teachers/${t.id}`);
      if (res.data && res.data.success) {
        const full = res.data.data;
        setAssignedClassIds(full.classes?.map((c) => c.id) || []);
        setAssignedSubjectIds(full.subjects?.map((s) => s.id) || []);
      }
      setAssignModalOpen(true);
    } catch (err) {
      showError('Failed to load assignments.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        await api.put(`/teachers/${editingTeacher.id}`, formData);
        showSuccess('Teacher details updated successfully.');
      } else {
        await api.post('/teachers', formData);
        showSuccess('New teacher account created.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save teacher.');
    }
  };

  const handleSaveAssignments = async () => {
    if (!assigningTeacher) return;
    try {
      await Promise.all([
        api.post(`/teachers/${assigningTeacher.id}/classes`, { classIds: assignedClassIds }),
        api.post(`/teachers/${assigningTeacher.id}/subjects`, { subjectIds: assignedSubjectIds })
      ]);
      showSuccess(`Teaching assignments updated for ${assigningTeacher.full_name}.`);
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update assignments.');
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate teacher ${name}?`)) return;
    try {
      await api.delete(`/teachers/${id}`);
      showSuccess(`Teacher ${name} deactivated.`);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to deactivate teacher.');
    }
  };

  const toggleClassAssignment = (classId) => {
    setAssignedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const toggleSubjectAssignment = (subjectId) => {
    setAssignedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Teacher Management</h1>
          <p className="page-subtitle">Manage faculty profiles, employee IDs, and classroom/subject assignments.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          <UserPlus size={18} /> Add New Teacher
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-item" style={{ flex: 2 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search teachers by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} height="52px" />
      ) : teachers.length === 0 ? (
        <EmptyState title="No Teachers Found" message="No teachers registered in the system yet." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Assigned Classes</th>
                <th>Assigned Subjects</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.email}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{t.employee_id}</span>
                  </td>
                  <td>{t.department || '-'}</td>
                  <td>{t.designation || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleOpenAssign(t)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    >
                      <School size={12} /> {t.assigned_classes_count || 0} Classes
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleOpenAssign(t)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    >
                      <BookOpen size={12} /> {t.assigned_subjects_count || 0} Subjects
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="Edit Teacher"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(t.id, t.full_name)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="Deactivate Teacher"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeacher ? 'Edit Teacher' : 'Create Teacher Account'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSave} className="btn btn-primary btn-sm">Save Teacher</button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Dr. Alex Mercer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              required
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="teacher@aigroup.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password {editingTeacher && '(Leave blank to retain current)'}</label>
            <input
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingTeacher ? '••••••••' : 'teacher123'}
              required={!editingTeacher}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Employee ID *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              placeholder="EMP002"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <input
              type="text"
              className="form-input"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Artificial Intelligence"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Designation</label>
            <input
              type="text"
              className="form-input"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="Professor"
            />
          </div>
        </form>
      </Modal>

      {/* Teaching Assignments Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assignments for ${assigningTeacher?.full_name}`}
        maxWidth="640px"
        footer={
          <>
            <button onClick={() => setAssignModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSaveAssignments} className="btn btn-primary btn-sm">Save Assignments</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
              Assign Classes (Webcam Attendance Access)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
              {classes.map((c) => {
                const checked = assignedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${checked ? '#10b981' : '#e2e8f0'}`,
                      background: checked ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClassAssignment(c.id)}
                    />
                    <span>{c.class_name} ({c.section})</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
              Assign Subjects
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
              {subjects.map((s) => {
                const checked = assignedSubjectIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${checked ? '#10b981' : '#e2e8f0'}`,
                      background: checked ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSubjectAssignment(s.id)}
                    />
                    <span>{s.subject_code} - {s.subject_name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
