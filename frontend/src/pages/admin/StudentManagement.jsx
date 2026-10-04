import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import WebcamCapture from '../../components/webcam/WebcamCapture';
import { useToast } from '../../context/ToastContext';
import {
  UserPlus,
  Search,
  Filter,
  Camera,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Upload,
  Sparkles,
  Check,
  X
} from 'lucide-react';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const { showSuccess, showError } = useToast();

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'face'
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Quick Camera Modal for Existing Students
  const [quickStudent, setQuickStudent] = useState(null);
  const [quickCameraActive, setQuickCameraActive] = useState(true);
  const [quickCapturedImage, setQuickCapturedImage] = useState(null);
  const [quickCapturedFile, setQuickCapturedFile] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const quickWebcamRef = useRef(null);
  const quickFileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '1234',
    studentId: '',
    rollNumber: '',
    classId: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    dateOfBirth: '',
    gender: 'MALE',
    address: '',
    admissionDate: '',
    lowAttendanceThreshold: 75.0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStu, resCls] = await Promise.all([
        api.get('/students', { params: { search, classId: selectedClassId } }),
        api.get('/classes')
      ]);
      if (resStu.data && resStu.data.success) {
        setStudents(resStu.data.data);
      }
      if (resCls.data && resCls.data.success) {
        setClasses(resCls.data.data);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to fetch student directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedClassId]);

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '1234',
      studentId: `STU${String(Date.now()).slice(-4)}`,
      rollNumber: '',
      classId: classes[0]?.id || '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      dateOfBirth: '',
      gender: 'MALE',
      address: '',
      admissionDate: new Date().toISOString().split('T')[0],
      lowAttendanceThreshold: 75.0
    });
    setCapturedImage(null);
    setCapturedFile(null);
    setCameraActive(false);
    setActiveTab('details');
    setModalOpen(true);
  };

  const handleOpenEdit = (stu) => {
    setEditingStudent(stu);
    setFormData({
      fullName: stu.full_name || '',
      email: stu.email || '',
      phone: stu.phone || '',
      password: '', // blank unless updating
      studentId: stu.student_id || '',
      rollNumber: stu.roll_number || '',
      classId: stu.class_id || '',
      parentName: stu.parent_name || '',
      parentPhone: stu.parent_phone || '',
      parentEmail: stu.parent_email || '',
      dateOfBirth: stu.date_of_birth ? stu.date_of_birth.split('T')[0] : '',
      gender: stu.gender || 'MALE',
      address: stu.address || '',
      admissionDate: stu.admission_date ? stu.admission_date.split('T')[0] : '',
      lowAttendanceThreshold: stu.low_attendance_threshold || 75.0
    });
    setCapturedImage(null);
    setCapturedFile(null);
    setCameraActive(false);
    setActiveTab('details');
    setModalOpen(true);
  };

  const handleCaptureWebcam = async () => {
    if (!webcamRef.current) return;
    try {
      const res = await webcamRef.current.captureBlob();
      setCapturedImage(res.dataUrl);
      setCapturedFile(res.file);
      setCameraActive(false);
      showSuccess('Face image captured! Ready for biometric enrollment.');
    } catch (err) {
      showError('Failed to capture frame from webcam.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setCameraActive(false);
      showSuccess('Face image selected! Ready for biometric enrollment.');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenQuickCapture = (stu) => {
    setQuickStudent(stu);
    setQuickCapturedImage(null);
    setQuickCapturedFile(null);
    setQuickCameraActive(true);
  };

  const handleQuickCaptureWebcam = async () => {
    if (!quickWebcamRef.current) return;
    try {
      const res = await quickWebcamRef.current.captureBlob();
      setQuickCapturedImage(res.dataUrl);
      setQuickCapturedFile(res.file);
      setQuickCameraActive(false);
      showSuccess('Face snapshot taken!');
    } catch (err) {
      showError('Failed to capture image from camera.');
    }
  };

  const handleQuickFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuickCapturedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setQuickCapturedImage(reader.result);
      setQuickCameraActive(false);
      showSuccess('Face photo selected!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQuickCapture = async () => {
    if (!quickCapturedFile || !quickStudent) return;
    setQuickSaving(true);
    try {
      const faceData = new FormData();
      faceData.append('image', quickCapturedFile);
      faceData.append('imageNumber', '1');
      faceData.append('expectedPose', 'natural_front');
      await api.post(`/students/${quickStudent.id}/register-face`, faceData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showSuccess(`Face biometric registered for ${quickStudent.full_name}!`);
      setQuickStudent(null);
      setQuickCapturedImage(null);
      setQuickCapturedFile(null);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to enroll face.');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      let targetId = editingStudent?.id;
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, formData);
      } else {
        const res = await api.post('/students', formData);
        targetId = res.data?.studentId;
      }

      // If user captured an image, upload and register it with AI service
      if (capturedFile && targetId) {
        try {
          const faceData = new FormData();
          faceData.append('image', capturedFile);
          faceData.append('imageNumber', '1');
          faceData.append('expectedPose', 'natural_front');
          await api.post(`/students/${targetId}/register-face`, faceData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          showSuccess('Student enrolled and face biometric profile registered!');
        } catch (faceErr) {
          const faceMsg = faceErr.response?.data?.message || 'Face detection could not verify image.';
          showError(`Student saved, but face enrollment notice: ${faceMsg}`);
        }
      } else {
        showSuccess(editingStudent ? 'Student details updated.' : 'Student enrolled successfully.');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save student.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to deactivate student ${studentName}?`)) return;
    try {
      await api.delete(`/students/${studentId}`);
      showSuccess(`Student ${studentName} deactivated.`);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to deactivate student.');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="page-subtitle">Manage student enrollments, biometrics, profiles, and classroom assignments.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          <UserPlus size={18} /> Enroll New Student
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-item" style={{ flex: 2 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Search by Name, Roll No, or ID</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Filter by Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.8125rem' }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name} ({c.section})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <LoadingSkeleton rows={6} height="52px" />
      ) : students.length === 0 ? (
        <EmptyState
          title="No Students Found"
          message="No student records match your query or filter criteria."
          action={
            <button onClick={handleOpenCreate} className="btn btn-primary btn-sm">
              <UserPlus size={16} /> Enroll First Student
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Class & Section</th>
                <th>Face Profile</th>
                <th>Threshold</th>
                <th>Parent Info</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((stu) => {
                const faceStatus = stu.face_status || 'PENDING';
                return (
                  <tr key={stu.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{stu.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        ID: {stu.student_id} | {stu.email}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{stu.roll_number || 'N/A'}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{stu.class_name || 'Unassigned'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Section: {stu.section || '-'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <Badge status={faceStatus} label={`${faceStatus} (${stu.face_images_count || 0}/5)`} />
                        <button
                          onClick={() => handleOpenQuickCapture(stu)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Quick Snap Face Photo with Camera"
                        >
                          <Camera size={12} /> Snap Photo
                        </button>
                        {faceStatus !== 'COMPLETED' && (
                          <Link
                            to={`/student/face-register?studentId=${stu.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            title="Register 5 Face Angles"
                          >
                            5-Pose
                          </Link>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: stu.low_attendance_threshold > 75 ? '#d97706' : '#059669' }}>
                        {stu.low_attendance_threshold}%
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>{stu.parent_name || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stu.parent_phone || stu.parent_email || '-'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEdit(stu)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          title="Edit Student"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeactivate(stu.id, stu.full_name)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 8px' }}
                          title="Deactivate Student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Enroll New Student'}
        maxWidth="720px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeTab === 'details' ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('face');
                    setCameraActive(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Camera size={14} /> Next: Capture Face Photo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="btn btn-secondary btn-sm"
                >
                  ← Back to Details
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary btn-sm"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : capturedFile ? 'Save & Register Face' : 'Save Student'}
              </button>
            </div>
          </div>
        }
      >
        {/* Step Tabs Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'details' ? '#ecfdf5' : 'transparent',
              color: activeTab === 'details' ? '#065f46' : '#64748b',
              border: activeTab === 'details' ? '1px solid #a7f3d0' : '1px solid transparent',
              fontWeight: 600,
              borderRadius: '8px 8px 0 0'
            }}
          >
            1. Student Information
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('face');
              if (!capturedImage) setCameraActive(true);
            }}
            className="btn btn-sm"
            style={{
              background: activeTab === 'face' ? '#ecfdf5' : 'transparent',
              color: activeTab === 'face' ? '#065f46' : '#64748b',
              border: activeTab === 'face' ? '1px solid #a7f3d0' : '1px solid transparent',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px 8px 0 0'
            }}
          >
            <Camera size={14} />
            2. Live Face Capture {capturedImage && '✅'}
          </button>
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Johnathan Vance"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Student Email *</label>
              <input
                type="email"
                required
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@aigroup.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Password (Default: 1234)</label>
              <input
                type="text"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="1234"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Student ID Code *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="STU004"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="21AI04"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Class *</label>
              <select
                required
                className="form-select"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.section}) - {c.academic_year}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Low Attendance Threshold (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className="form-input"
                value={formData.lowAttendanceThreshold}
                onChange={(e) => setFormData({ ...formData, lowAttendanceThreshold: parseFloat(e.target.value) || 75 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent / Guardian Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                placeholder="Parent full name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Phone</label>
              <input
                type="text"
                className="form-input"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="9876543210"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Parent Email (for Absence Notifications)</label>
              <input
                type="email"
                className="form-input"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                placeholder="parent.doe@aigroup.com"
              />
            </div>
          </form>
        ) : (
          /* Face Capture Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {capturedImage ? (
              <div style={{
                textAlign: 'center',
                padding: '1.5rem',
                border: '2px dashed #10b981',
                borderRadius: '12px',
                backgroundColor: '#f0fdf4',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <img
                  src={capturedImage}
                  alt="Captured face"
                  style={{
                    width: '180px',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '3px solid #10b981',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                />
                <div style={{ fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  Face Photo Ready for Enrollment!
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#047857' }}>
                  This face will be registered with YuNet + SFace when you click "Save & Register Face".
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null);
                      setCapturedFile(null);
                      setCameraActive(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <RefreshCw size={14} /> Retake with Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                  >
                    <Upload size={14} /> Upload Different Photo
                  </button>
                </div>
              </div>
            ) : cameraActive ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '100%', maxWidth: '480px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #059669' }}>
                  <WebcamCapture ref={webcamRef} showOvalGuide={true} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleCaptureWebcam}
                    className="btn btn-primary"
                    style={{ padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Camera size={18} /> Snap Face Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraActive(false)}
                    className="btn btn-secondary"
                  >
                    Cancel Camera
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Camera size={32} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Capture Biometric Face Photo</h4>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: '380px' }}>
                    Capture a clear front-facing image using the camera or upload a picture for AI facial attendance matching.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCameraActive(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Camera size={16} /> Open Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Upload size={16} /> Upload Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Quick Camera Capture Modal for Existing Student */}
      {quickStudent && (
        <Modal
          isOpen={!!quickStudent}
          onClose={() => setQuickStudent(null)}
          title={`Quick Face Capture: ${quickStudent.full_name}`}
          maxWidth="540px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button onClick={() => setQuickStudent(null)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleSaveQuickCapture}
                disabled={!quickCapturedFile || quickSaving}
                className="btn btn-primary btn-sm"
              >
                {quickSaving ? 'Registering Face...' : 'Save Face Biometric'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <input
              type="file"
              ref={quickFileInputRef}
              onChange={handleQuickFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {quickCapturedImage ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <img
                  src={quickCapturedImage}
                  alt="Captured"
                  style={{
                    width: '180px',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '3px solid #10b981'
                  }}
                />
                <div style={{ color: '#065f46', fontWeight: 600, fontSize: '0.875rem' }}>
                  Face photo captured for {quickStudent.full_name}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCapturedImage(null);
                      setQuickCapturedFile(null);
                      setQuickCameraActive(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <RefreshCw size={14} /> Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                  >
                    <Upload size={14} /> Choose File
                  </button>
                </div>
              </div>
            ) : quickCameraActive ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #059669' }}>
                  <WebcamCapture ref={quickWebcamRef} showOvalGuide={true} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleQuickCaptureWebcam}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Camera size={16} /> Snap Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                  >
                    <Upload size={16} /> Upload Photo
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}
