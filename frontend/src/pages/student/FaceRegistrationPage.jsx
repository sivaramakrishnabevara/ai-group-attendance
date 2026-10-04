import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import WebcamCapture from '../../components/webcam/WebcamCapture';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Check
} from 'lucide-react';

const ENROLLMENT_STEPS = [
  { step: 1, pose: 'natural_front', label: 'Step 1: Natural Front', instruction: 'Look directly into the camera with a neutral expression' },
  { step: 2, pose: 'slight_left', label: 'Step 2: Slight Left', instruction: 'Gently turn your head slightly to your left (~15°)' },
  { step: 3, pose: 'slight_right', label: 'Step 3: Slight Right', instruction: 'Gently turn your head slightly to your right (~15°)' },
  { step: 4, pose: 'slight_up_down', label: 'Step 4: Slight Up/Down', instruction: 'Tilt your chin slightly upwards or downwards' },
  { step: 5, pose: 'natural_front', label: 'Step 5: Natural Front', instruction: 'Look straight at the camera again for final confirmation' }
];

export default function FaceRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const webcamRef = useRef(null);

  // Target student id (admin can enroll for student, or student enrolls for self)
  const [targetStudentId, setTargetStudentId] = useState(searchParams.get('studentId') || '');
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 to 4
  const [enrolledSteps, setEnrolledSteps] = useState([false, false, false, false, false]);
  const [capturedThumbnails, setCapturedThumbnails] = useState(['', '', '', '', '']);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [validationSuccess, setValidationSuccess] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch current enrollment status
  useEffect(() => {
    async function loadStatus() {
      setLoadingStatus(true);
      try {
        let stuId = targetStudentId;
        if (!stuId) {
          // fetch self student id
          const meRes = await api.get('/students/dashboard');
          if (meRes.data?.data?.student?.id) {
            stuId = meRes.data.data.student.id;
            setTargetStudentId(stuId);
          }
        }

        if (stuId) {
          const res = await api.get(`/students/${stuId}/face-status`);
          if (res.data?.success) {
            const { profile, enrolledImages, isCompleted: done } = res.data.data;
            setIsCompleted(done);

            const stepsState = [false, false, false, false, false];
            const thumbs = ['', '', '', '', ''];

            enrolledImages?.forEach((img) => {
              const num = img.image_number;
              if (num >= 1 && num <= 5) {
                stepsState[num - 1] = true;
                thumbs[num - 1] = img.image_path;
              }
            });

            setEnrolledSteps(stepsState);
            setCapturedThumbnails(thumbs);

            // Set current step to first incomplete step
            const firstIncomplete = stepsState.findIndex((s) => !s);
            if (firstIncomplete !== -1) {
              setCurrentStepIndex(firstIncomplete);
            } else {
              setCurrentStepIndex(4);
            }
          }
        }
      } catch (err) {
        showError('Failed to load enrollment status.');
      } finally {
        setLoadingStatus(false);
      }
    }
    loadStatus();
  }, [targetStudentId]);

  const currentStep = ENROLLMENT_STEPS[currentStepIndex];

  // Capture current step pose and submit to backend
  const handleCaptureStep = async () => {
    if (!webcamRef.current) return;
    setValidationError('');
    setValidationSuccess('');
    setIsProcessing(true);

    try {
      const captureResult = await webcamRef.current.captureBlob();

      const formData = new FormData();
      formData.append('image', captureResult.file);
      formData.append('imageNumber', String(currentStep.step));
      formData.append('expectedPose', currentStep.pose);

      const stuId = targetStudentId || 'me';
      const res = await api.post(`/students/${stuId}/register-face`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setValidationSuccess(`Image ${currentStep.step}/5 accepted! Score: ${(res.data.qualityScore * 100).toFixed(1)}%`);
        showSuccess(`Step ${currentStep.step}/5 valid! Pose verified.`);

        // Update local step state
        const updatedSteps = [...enrolledSteps];
        updatedSteps[currentStepIndex] = true;
        setEnrolledSteps(updatedSteps);

        const updatedThumbs = [...capturedThumbnails];
        updatedThumbs[currentStepIndex] = captureResult.dataUrl;
        setCapturedThumbnails(updatedThumbs);

        if (res.data.isCompleted || currentStepIndex === 4) {
          setIsCompleted(true);
          showSuccess('Congratulations! All 5 facial angles enrolled. Biometric profile completed!');
        } else {
          // Advance to next pose
          setCurrentStepIndex((prev) => Math.min(4, prev + 1));
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Face validation failed.';
      const val = err.response?.data?.validation;
      let detailedMsg = msg;
      if (val?.issues && val.issues.length > 0) {
        detailedMsg = `${msg} (${val.issues.join(', ')})`;
      }
      setValidationError(detailedMsg);
      showWarning(detailedMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">5-Pose Biometric Face Registration</h1>
          <p className="page-subtitle">
            To ensure reliable classroom recognition, enroll exactly 5 distinct facial angles using YuNet alignment and SFace embedding normalization.
          </p>
        </div>
      </div>

      {/* 5-Step Progress Stepper */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        marginBottom: '1.75rem'
      }}>
        {ENROLLMENT_STEPS.map((s, idx) => {
          const isDone = enrolledSteps[idx];
          const isCurrent = currentStepIndex === idx;

          let bg = '#ffffff';
          let border = '#e2e8f0';
          let textColor = '#64748b';

          if (isDone) {
            bg = '#ecfdf5';
            border = '#059669';
            textColor = '#065f46';
          } else if (isCurrent) {
            bg = '#eff6ff';
            border = '#2563eb';
            textColor = '#1e40af';
          }

          return (
            <div
              key={s.step}
              onClick={() => setCurrentStepIndex(idx)}
              style={{
                padding: '12px 10px',
                borderRadius: '10px',
                border: `2px solid ${border}`,
                backgroundColor: bg,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                margin: '0 auto 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8125rem',
                backgroundColor: isDone ? '#059669' : isCurrent ? '#2563eb' : '#e2e8f0',
                color: isDone || isCurrent ? '#ffffff' : '#64748b'
              }}>
                {isDone ? <Check size={16} /> : s.step}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: textColor }}>
                {s.pose.replace('_', ' ').toUpperCase()}
              </div>
              <div style={{ fontSize: '0.6875rem', color: isDone ? '#059669' : '#94a3b8' }}>
                {isDone ? 'Enrolled' : isCurrent ? 'Active' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Enrollment Stage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Left: Camera Feed with Oval Guide */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="card-header">
            <h3 className="card-title">{currentStep.label}</h3>
            <Badge status={enrolledSteps[currentStepIndex] ? 'COMPLETED' : 'PENDING'} />
          </div>

          <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <WebcamCapture
              ref={webcamRef}
              showOvalGuide={true}
              isOvalValid={!validationError}
              ovalInstruction={currentStep.instruction}
            />
          </div>

          {/* Validation Feedback Messages */}
          {validationError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} color="#dc2626" />
              <span>{validationError}</span>
            </div>
          )}

          {validationSuccess && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>{validationSuccess}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
            <button
              onClick={handleCaptureStep}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <Camera size={18} />
              {isProcessing ? 'Validating Face...' : `Capture & Enroll Step ${currentStep.step}`}
            </button>
          </div>
        </div>

        {/* Right: Enrolled Thumbnails & Instruction Guidelines */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3 className="card-title">Enrolled Poses Gallery</h3>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {enrolledSteps.filter(Boolean).length}/5 Completed
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '1.25rem' }}>
            {capturedThumbnails.map((thumb, idx) => (
              <div
                key={idx}
                style={{
                  height: '80px',
                  borderRadius: '8px',
                  border: `2px solid ${enrolledSteps[idx] ? '#059669' : '#e2e8f0'}`,
                  backgroundColor: '#f8fafc',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {thumb ? (
                  <img src={thumb} alt={`Step ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>#{idx + 1}</span>
                )}
                {enrolledSteps[idx] && (
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#059669',
                    borderRadius: '50%',
                    padding: '2px',
                    color: '#ffffff',
                    display: 'flex'
                  }}>
                    <Check size={10} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Validation Checklist */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a', marginBottom: '0.5rem' }}>
              Real-Time Validation Rules
            </h4>
            <ul style={{ fontSize: '0.8125rem', color: '#475569', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
              <li>Ensure only <strong>ONE face</strong> is present in camera view.</li>
              <li>Face must be centered inside the oval guide overlay.</li>
              <li>Avoid high-glare backlighting and dark shadows.</li>
              <li>Ensure camera lens is clean to prevent blur rejection.</li>
            </ul>
          </div>

          {isCompleted && (
            <div style={{ marginTop: 'auto', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 700, marginBottom: '0.75rem' }}>
                <CheckCircle2 size={20} />
                <span>Biometric Enrollment Complete</span>
              </div>
              <button
                onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/students' : '/student/dashboard')}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Return to Dashboard <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
