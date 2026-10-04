import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';

const WebcamCapture = forwardRef(({ onCapture, onStreamReady, showOvalGuide = false, isOvalValid = false, ovalInstruction = '' }, ref) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Start webcam
  const startCamera = async (deviceId = '') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: deviceId ? undefined : 'user',
          deviceId: deviceId ? { exact: deviceId } : undefined
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          if (onStreamReady) {
            onStreamReady(videoRef.current);
          }
        };
      }

      setHasPermission(true);
      setErrorMessage('');

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(cams);
      if (cams.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(cams[0].deviceId);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage('Could not access webcam. Please ensure camera permissions are granted in your browser.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Expose capture method to parent component via ref
  useImperativeHandle(ref, () => ({
    captureBlob: () => {
      return new Promise((resolve, reject) => {
        if (!videoRef.current) {
          return reject(new Error('Video element not available'));
        }
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Failed to capture frame'));
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          resolve({ blob, file, dataUrl: canvas.toDataURL('image/jpeg', 0.95) });
        }, 'image/jpeg', 0.95);
      });
    },
    getVideoElement: () => videoRef.current
  }));

  const handleDeviceChange = (e) => {
    const id = e.target.value;
    setSelectedDeviceId(id);
    startCamera(id);
  };

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
      {hasPermission === false ? (
        <div style={{
          aspectRatio: '16 / 9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          color: '#ffffff',
          textAlign: 'center'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Camera Access Required</h4>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '420px', marginBottom: '1.25rem' }}>
            {errorMessage}
          </p>
          <button onClick={() => startCamera(selectedDeviceId)} className="btn btn-primary btn-sm">
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      ) : (
        <div className="webcam-viewport-wrapper">
          <video
            ref={videoRef}
            playsInline
            muted
            className="webcam-video-element"
          />

          {/* Oval Guide for Single Student 5-step Enrollment */}
          {showOvalGuide && (
            <>
              <div className={`camera-oval-guide ${isOvalValid ? 'valid' : 'invalid'}`} />
              {ovalInstruction && (
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: isOvalValid ? 'rgba(5, 150, 105, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(4px)',
                  textAlign: 'center',
                  zIndex: 20
                }}>
                  {ovalInstruction}
                </div>
              )}
            </>
          )}

          {/* Camera switcher toolbar */}
          {videoDevices.length > 1 && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.75)',
              padding: '4px 8px',
              borderRadius: '8px',
              backdropFilter: 'blur(4px)'
            }}>
              <Camera size={14} color="#ffffff" />
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId} style={{ background: '#0f172a' }}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default WebcamCapture;
