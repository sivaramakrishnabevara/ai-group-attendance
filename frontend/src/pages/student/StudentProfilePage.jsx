import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { User, Camera, ShieldCheck, Mail, Phone, Calendar, MapPin, School } from 'lucide-react';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/students/dashboard');
        if (res.data?.success) {
          setProfile(res.data.data.student);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="page-wrapper">
        <LoadingSkeleton rows={6} height="52px" />
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '860px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Profile</h1>
          <p className="page-subtitle">Personal academic credentials, parent contact details, and biometric registration profile.</p>
        </div>
        <Link to="/student/face-register" className="btn btn-secondary btn-sm">
          <Camera size={16} /> Manage Face Profile
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Profile Header Card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 800
          }}>
            {profile?.full_name ? profile.full_name.charAt(0) : 'S'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{profile?.full_name}</h2>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Student ID: <strong>{profile?.student_id}</strong> • Roll No: <strong>{profile?.roll_number}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Badge status={profile?.registration_status || 'PENDING'} label={`Face Biometrics: ${profile?.registration_status || 'PENDING'}`} />
              <Badge status="ACTIVE" label={profile?.class_name || 'Class Enrolled'} />
            </div>
          </div>
        </div>

        {/* Academic & Personal Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Academic & Contact Information</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CLASS & SECTION</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {profile?.class_name} ({profile?.section})
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>EMAIL ADDRESS</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{profile?.email}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PHONE NUMBER</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{profile?.phone || 'Not provided'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>MINIMUM ATTENDANCE THRESHOLD</div>
              <div style={{ fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {profile?.low_attendance_threshold}%
              </div>
            </div>
          </div>
        </div>

        {/* Parent / Guardian Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Parent / Guardian Contact</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>GUARDIAN NAME</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {profile?.parent_name || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>GUARDIAN PHONE</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {profile?.parent_phone || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NOTIFICATION EMAIL</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {profile?.parent_email || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
