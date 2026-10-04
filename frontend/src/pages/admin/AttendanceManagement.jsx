import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import FaceBoundingBoxOverlay from '../../components/webcam/FaceBoundingBoxOverlay';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  Lock,
  Eye,
  Check,
  X,
  FileCheck2,
  Filter
} from 'lucide-react';

export default function AttendanceManagement() {
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { showSuccess, showError } = useToast();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/sessions', {
        params: { status: statusFilter || undefined }
      });
      if (res.data && res.data.success) {
        setSessions(res.data.data);
        if (initialSessionId) {
          const match = res.data.data.find((s) => String(s.id) === String(initialSessionId));
          if (match) {
            handleSelectSession(match);
          }
        }
      }
    } catch (err) {
      showError('Failed to fetch attendance sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  const handleSelectSession = async (ses) => {
    setSelectedSession(ses);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/attendance/sessions/${ses.id}`);
      if (res.data && res.data.success) {
        setSessionDetails(res.data.data);
      }
    } catch (err) {
      showError('Failed to load session details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdateRecordStatus = async (studentId, newStatus) => {
    if (!selectedSession) return;
    try {
      await api.put(`/attendance/sessions/${selectedSession.id}/records/${studentId}`, {
        status: newStatus
      });
      showSuccess(`Attendance updated to ${newStatus}`);
      // Refresh session details
      handleSelectSession(selectedSession);
    } catch (err) {
      showError('Failed to update attendance record.');
    }
  };

  const handleFinalize = async () => {
    if (!selectedSession) return;
    if (!window.confirm('Are you sure you want to finalize this session? This will lock attendance records and dispatch parent notices.')) return;

    setFinalizing(true);
    try {
      await api.post(`/attendance/sessions/${selectedSession.id}/finalize`);
      showSuccess('Attendance session finalized and locked successfully.');
      handleSelectSession(selectedSession);
      fetchSessions();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to finalize attendance.');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Administration</h1>
          <p className="page-subtitle">Review AI-recognized sessions, audit biometric match scores, adjust records, and finalize rosters.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '360px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Sessions List */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ fontSize: '1rem' }}>Recorded Sessions</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED (Review)</option>
              <option value="FINALIZED">FINALIZED</option>
              <option value="OPEN">OPEN</option>
            </select>
          </div>

          {loading ? (
            <LoadingSkeleton rows={4} height="60px" />
          ) : sessions.length === 0 ? (
            <EmptyState title="No Sessions Found" message="No sessions match the selected filter." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '700px', overflowY: 'auto' }}>
              {sessions.map((ses) => {
                const isSelected = selectedSession?.id === ses.id;
                return (
                  <div
                    key={ses.id}
                    onClick={() => handleSelectSession(ses)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${isSelected ? '#059669' : '#e2e8f0'}`,
                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 150ms ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                        {ses.subject_name || ses.subject_code}
                      </span>
                      <Badge status={ses.status} size="sm" />
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                      {ses.class_name} ({ses.section}) • {new Date(ses.session_date).toLocaleDateString()}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#059669', fontWeight: 600 }}>P: {ses.total_present}</span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>A: {ses.total_absent}</span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>U: {ses.total_unknown}</span>
                      <span style={{ color: '#64748b' }}>Total: {ses.total_students}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Session Inspector */}
        {selectedSession && (
          <div className="card">
            {detailsLoading ? (
              <LoadingSkeleton rows={8} height="40px" />
            ) : !sessionDetails ? (
              <EmptyState title="Select a Session" message="Click on any session from the left column to inspect and finalize." />
            ) : (
              <div>
                {/* Session Summary Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-light)',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        {sessionDetails.session.subject_name} ({sessionDetails.session.subject_code})
                      </h2>
                      <Badge status={sessionDetails.session.status} />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
                      Class: <strong>{sessionDetails.session.class_name} ({sessionDetails.session.section})</strong> • Instructor: <strong>{sessionDetails.session.teacher_name}</strong> • Date: <strong>{new Date(sessionDetails.session.session_date).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  {sessionDetails.session.status !== 'FINALIZED' && (
                    <button
                      onClick={handleFinalize}
                      disabled={finalizing}
                      className="btn btn-primary"
                    >
                      <FileCheck2 size={18} />
                      {finalizing ? 'Finalizing...' : 'Finalize Attendance'}
                    </button>
                  )}
                </div>

                {/* Captured Image Preview with YuNet Bounding Boxes */}
                {sessionDetails.session.capture_image && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
                      AI YuNet Detection Snapshot
                    </h4>
                    <div style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#0f172a',
                      maxHeight: '340px'
                    }}>
                      <img
                        src={sessionDetails.session.capture_image}
                        alt="Classroom Capture"
                        style={{ width: '100%', height: 'auto', maxHeight: '340px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                  </div>
                )}

                {/* Roster Table with AI Match Scores & Edit Controls */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a' }}>
                    Enrolled Students Roster ({sessionDetails.records?.length || 0})
                  </h4>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Roll No</th>
                          <th>Status</th>
                          <th>Method</th>
                          <th>Cosine Similarity</th>
                          <th>Quick Adjustment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionDetails.records?.map((rec) => {
                          const isFinalized = sessionDetails.session.status === 'FINALIZED';
                          return (
                            <tr key={rec.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.student_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.student_code}</div>
                              </td>
                              <td>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{rec.roll_number || '-'}</span>
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
                                  <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    color: rec.similarity_score >= 0.36 ? '#059669' : '#dc2626'
                                  }}>
                                    {(Number(rec.similarity_score) * 100).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>-</span>
                                )}
                              </td>
                              <td>
                                {!isFinalized ? (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      onClick={() => handleUpdateRecordStatus(rec.student_id, 'PRESENT')}
                                      className={`btn btn-sm ${rec.status === 'PRESENT' ? 'btn-primary' : 'btn-secondary'}`}
                                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                    >
                                      Present
                                    </button>
                                    <button
                                      onClick={() => handleUpdateRecordStatus(rec.student_id, 'ABSENT')}
                                      className={`btn btn-sm ${rec.status === 'ABSENT' ? 'btn-danger' : 'btn-secondary'}`}
                                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      onClick={() => handleUpdateRecordStatus(rec.student_id, 'LATE')}
                                      className={`btn btn-sm ${rec.status === 'LATE' ? 'btn-primary' : 'btn-secondary'}`}
                                      style={{ padding: '2px 8px', fontSize: '0.7rem', background: rec.status === 'LATE' ? '#f59e0b' : undefined }}
                                    >
                                      Late
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Locked (Finalized)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Unknown Faces in this Session */}
                {sessionDetails.unknownFaces && sessionDetails.unknownFaces.length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HelpCircle size={18} /> Unknown Faces Detected in this Session ({sessionDetails.unknownFaces.length})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                      {sessionDetails.unknownFaces.map((u) => (
                        <div key={u.id} style={{ border: '1px solid #fde68a', borderRadius: '8px', padding: '8px', background: '#fffbeb', textAlign: 'center' }}>
                          <img
                            src={u.image_path}
                            alt="Unknown Face"
                            style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', marginBottom: '6px' }}
                          />
                          <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 600 }}>
                            Score: {u.similarity_score ? `${(u.similarity_score * 100).toFixed(1)}%` : 'No Match'}
                          </div>
                          <Badge status={u.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
