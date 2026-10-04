import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import WebcamCapture from '../../components/webcam/WebcamCapture';
import FaceBoundingBoxOverlay from '../../components/webcam/FaceBoundingBoxOverlay';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import {
  Camera,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  Send,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';

export default function CaptureAttendancePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const { showSuccess, showError, showInfo } = useToast();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('classId') || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(searchParams.get('subjectId') || '');
  const [activeSession, setActiveSession] = useState(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [submittingSession, setSubmittingSession] = useState(false);

  // Recognition Results
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [recognizedFaces, setRecognizedFaces] = useState([]);
  const [unknownFaces, setUnknownFaces] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    unknown: 0
  });

  // Load teacher classes & subjects
  useEffect(() => {
    async function loadMeta() {
      setLoadingInit(true);
      try {
        let classesData = [];
        let subjectsData = [];

        // 1. Try teacher-specific assignments
        try {
          const [resC, resS] = await Promise.all([
            api.get('/teachers/my-classes'),
            api.get('/teachers/my-subjects')
          ]);
          if (resC.data?.success && resC.data.data?.length > 0) {
            classesData = resC.data.data;
          }
          if (resS.data?.success && resS.data.data?.length > 0) {
            subjectsData = resS.data.data;
          }
        } catch {
          // fallback to public/admin catalog
        }

        // 2. Fallback to all classes if empty
        if (classesData.length === 0) {
          try {
            const resAllC = await api.get('/classes');
            if (resAllC.data?.success) classesData = resAllC.data.data;
          } catch {}
        }

        // 3. Fallback to all subjects if empty
        if (subjectsData.length === 0) {
          try {
            const resAllS = await api.get('/subjects');
            if (resAllS.data?.success) subjectsData = resAllS.data.data;
          } catch {}
        }

        setClasses(classesData);
        setSubjects(subjectsData);

        let initialClassId = classesData.length > 0 ? classesData[0].id : '';
        let initialSubjectId = subjectsData.length > 0 ? subjectsData[0].id : '';

        // Check if an active OPEN session is already running
        try {
          const resSessions = await api.get('/attendance/sessions', { params: { status: 'OPEN', limit: 1 } });
          const openList = Array.isArray(resSessions.data?.data)
            ? resSessions.data.data
            : (resSessions.data?.data?.sessions || resSessions.data?.sessions || []);
          if (openList.length > 0) {
            const active = openList[0];
            setActiveSession(active);
            initialClassId = active.class_id;
            initialSubjectId = active.subject_id;

            // Fetch session records
            const resDet = await api.get(`/attendance/sessions/${active.id}`);
            if (resDet.data?.data) {
              const { records: existingRecords, unknownFaces, session: sDetails } = resDet.data.data;
              if (existingRecords && existingRecords.length > 0) {
                setRecords(existingRecords);
                let p = 0;
                let a = 0;
                existingRecords.forEach((r) => (r.status === 'PRESENT' ? p++ : a++));
                setSummary({
                  total: existingRecords.length,
                  present: p,
                  absent: a,
                  unknown: unknownFaces?.length || 0
                });
              } else if (sDetails) {
                setSummary({
                  total: sDetails.total_students || 0,
                  present: sDetails.total_present || 0,
                  absent: sDetails.total_absent || sDetails.total_students || 0,
                  unknown: sDetails.total_unknown || 0
                });
              }
            }
          }
        } catch {
          // ignore
        }

        if (initialClassId && !selectedClassId) {
          setSelectedClassId(initialClassId);
        }
        if (initialSubjectId && !selectedSubjectId) {
          setSelectedSubjectId(initialSubjectId);
        }
      } catch (err) {
        showError('Failed to load classes or subjects.');
      } finally {
        setLoadingInit(false);
      }
    }
    loadMeta();
  }, []);

  // Start new attendance session
  const handleStartSession = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      showError('Please select both a class and a subject.');
      return;
    }

    try {
      const res = await api.post('/attendance/sessions', {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        sessionDate: new Date().toISOString().split('T')[0]
      });

      if (res.data?.success) {
        setActiveSession(res.data.session);
        showSuccess('Attendance session initiated. You may now capture classroom image.');
        setCapturedSnapshot(null);
        setRecognizedFaces([]);
        setUnknownFaces([]);
        const initialRecords = res.data.records || [];
        setRecords(initialRecords);
        setSummary({
          total: res.data.summary?.total_students || initialRecords.length || 0,
          present: res.data.summary?.present_count || 0,
          absent: res.data.summary?.absent_count || initialRecords.length || 0,
          unknown: 0
        });
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start session.');
    }
  };

  // Capture Group Frame and Run AI Biometrics Pipeline
  const handleCaptureAndRecognize = async () => {
    if (!activeSession) {
      showError('Please initiate an attendance session first.');
      return;
    }

    if (!webcamRef.current) return;

    try {
      setIsProcessingAI(true);
      showInfo('Capturing frame & executing YuNet + SFace recognition...');

      const captureResult = await webcamRef.current.captureBlob();
      setCapturedSnapshot(captureResult.dataUrl);

      const formData = new FormData();
      formData.append('image', captureResult.file);

      // Post to backend which calls Python FastAPI YuNet + SFace + Cosine Similarity
      const res = await api.post(`/attendance/sessions/${activeSession.id}/capture-group`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        const d = res.data.data;
        const recognized = d.recognized || [];
        const unknown = d.unknown || [];
        const updatedRecords = d.records || [];
        const sum = d.summary || {};

        setRecognizedFaces(recognized);
        setUnknownFaces(unknown);
        setRecords(updatedRecords);
        setSummary({
          total: sum.total_students !== undefined ? sum.total_students : (d.totalEnrolled || updatedRecords.length || 0),
          present: sum.present_count !== undefined ? sum.present_count : (d.totalPresent || recognized.length || 0),
          absent: sum.absent_count !== undefined ? sum.absent_count : (d.totalAbsent !== undefined ? d.totalAbsent : 0),
          unknown: sum.unknown_count !== undefined ? sum.unknown_count : (d.totalUnknown || unknown.length || 0)
        });

        const pCount = sum.present_count !== undefined ? sum.present_count : (d.totalPresent || recognized.length);
        const aCount = sum.absent_count !== undefined ? sum.absent_count : (d.totalAbsent || 0);
        showSuccess(`AI Recognition complete! ${pCount} PRESENT, ${aCount} ABSENT.`);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Biometric recognition failed. Please try again.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Manual Attendance Correction by Teacher
  const handleStatusChange = async (studentId, newStatus) => {
    if (!activeSession) return;
    try {
      await api.put(`/attendance/sessions/${activeSession.id}/records/${studentId}`, {
        status: newStatus
      });

      // Update local state
      setRecords((prev) => {
        const updated = prev.map((r) =>
          r.student_id === studentId ? { ...r, status: newStatus, recognition_method: 'MANUAL' } : r
        );
        let p = 0;
        let a = 0;
        updated.forEach((r) => {
          if (r.status === 'PRESENT') p++;
          else a++;
        });
        setSummary((s) => ({ ...s, present: p, absent: a }));
        return updated;
      });

      showSuccess(`Attendance adjusted to ${newStatus}`);
    } catch (err) {
      showError('Failed to update record.');
    }
  };

  // Submit Attendance to Admin (Status = SUBMITTED)
  const handleSubmitAttendance = async () => {
    if (!activeSession) return;
    if (!window.confirm('Submit attendance session for administrative review?')) return;

    setSubmittingSession(true);
    try {
      await api.post(`/attendance/sessions/${activeSession.id}/submit`);
      showSuccess('Attendance submitted successfully! Status is now SUBMITTED.');
      navigate('/teacher/dashboard');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setSubmittingSession(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Classroom Group Attendance</h1>
          <p className="page-subtitle">Instant multi-student biometric facial recognition using YuNet detector and SFace embeddings.</p>
        </div>
      </div>

      {/* Session Config Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Select Cohort / Class</label>
            <select
              value={selectedClassId}
              disabled={!!activeSession}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="form-select"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Select Course / Subject</label>
            <select
              value={selectedSubjectId}
              disabled={!!activeSession}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="form-select"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject_code} - {s.subject_name}
                </option>
              ))}
            </select>
          </div>

          {!activeSession ? (
            <button onClick={handleStartSession} className="btn btn-primary" style={{ height: '42px' }}>
              <Camera size={18} /> Initialize Session
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}>
              <Badge status="OPEN" label="SESSION ACTIVE" />
              <button
                onClick={() => {
                  setActiveSession(null);
                  setCapturedSnapshot(null);
                  setRecords([]);
                }}
                className="btn btn-secondary btn-sm"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Attendance Workflow Grid (Left: Camera / Viewport | Right: Live Telemetry Summary) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left: Webcam Capture Viewport with Overlaid Canvas */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="card-header">
            <h3 className="card-title">Live Classroom Feed</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>YuNet Multi-Face Scanner</span>
          </div>

          <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            {!capturedSnapshot ? (
              <WebcamCapture ref={webcamRef} />
            ) : (
              <div className="webcam-viewport-wrapper">
                <img
                  src={capturedSnapshot}
                  alt="Captured Group"
                  className="webcam-video-element"
                />
                <FaceBoundingBoxOverlay
                  recognizedFaces={recognizedFaces}
                  unknownFaces={unknownFaces}
                  imageWidth={1280}
                  imageHeight={720}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
            <button
              onClick={handleCaptureAndRecognize}
              disabled={!activeSession || isProcessingAI}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {isProcessingAI ? (
                <span>Running YuNet + SFace...</span>
              ) : (
                <>
                  <Camera size={18} /> Capture & Recognize
                </>
              )}
            </button>

            {capturedSnapshot && (
              <button
                onClick={() => setCapturedSnapshot(null)}
                className="btn btn-secondary"
                title="Return to live feed"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Live Roster & Attendance Counts Summary */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3 className="card-title">Session Roster Summary</h3>
            {records.length > 0 && <Badge status="PROCESSING" label="READY FOR SUBMISSION" />}
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>PRESENT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{summary.present}</div>
            </div>
            <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>ABSENT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{summary.absent}</div>
            </div>
            <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>UNKNOWN FACES</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{summary.unknown}</div>
            </div>
            <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>TOTAL STUDENTS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{summary.total}</div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <button
              onClick={handleSubmitAttendance}
              disabled={!activeSession || submittingSession}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              <Send size={18} />
              {submittingSession ? 'Submitting to Admin...' : 'Submit Attendance (Review Complete)'}
            </button>
            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
              After submission, status will update to <strong>SUBMITTED</strong> for administrator finalization.
            </p>
          </div>
        </div>
      </div>

      {/* Student Attendance Review Table */}
      {records.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Detailed Student Verification Table</h3>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Verify AI matches and manually override any student status if needed.
            </span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Current Status</th>
                  <th>Method</th>
                  <th>Similarity Score</th>
                  <th>Quick Action (Override)</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const isPresent = rec.status === 'PRESENT';
                  return (
                    <tr key={rec.student_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {rec.student_code}</div>
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
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleStatusChange(rec.student_id, 'PRESENT')}
                            className={`btn btn-sm ${rec.status === 'PRESENT' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          >
                            Mark Present
                          </button>
                          <button
                            onClick={() => handleStatusChange(rec.student_id, 'ABSENT')}
                            className={`btn btn-sm ${rec.status === 'ABSENT' ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          >
                            Mark Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
