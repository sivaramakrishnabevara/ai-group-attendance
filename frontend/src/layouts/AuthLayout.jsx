import React from 'react';
import { Outlet } from 'react-router-dom';
import { Camera, ShieldCheck, Smartphone, BarChart3 } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.72) 40%, rgba(6, 78, 59, 0.82) 100%), url('/classroom_bg.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      padding: '2.5rem 1.5rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1240px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '3.5rem',
        margin: '0 auto'
      }}>
        {/* Left Hero Side */}
        <div style={{
          flex: '1 1 500px',
          color: '#ffffff',
          padding: '1rem 0'
        }}>
          {/* Top Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            backdropFilter: 'blur(12px)',
            marginBottom: '2rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
          }}>
            AI Attendance Dashboard Showcase
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
            color: '#ffffff',
            textShadow: '0 2px 12px rgba(0, 0, 0, 0.45)'
          }}>
            AI Group<br />Attendance System
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.25rem',
            color: '#e2e8f0',
            fontWeight: 500,
            marginBottom: '3.25rem',
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.45)'
          }}>
            Smart Attendance for Brighter Tomorrows
          </p>

          {/* 4 Feature Highlights */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))',
            gap: '1.25rem',
            maxWidth: '560px'
          }}>
            <div className="auth-feature-box">
              <div className="auth-feature-icon-wrap">
                <Camera size={26} color="#ffffff" strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">AI Face Recognition</span>
            </div>

            <div className="auth-feature-box">
              <div className="auth-feature-icon-wrap">
                <ShieldCheck size={26} color="#ffffff" strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">Accurate Attendance</span>
            </div>

            <div className="auth-feature-box">
              <div className="auth-feature-icon-wrap">
                <Smartphone size={26} color="#ffffff" strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">Parent SMS Alerts</span>
            </div>

            <div className="auth-feature-box">
              <div className="auth-feature-icon-wrap">
                <BarChart3 size={26} color="#ffffff" strokeWidth={2.2} />
              </div>
              <span className="auth-feature-label">Reports & Analytics</span>
            </div>
          </div>
        </div>

        {/* Right Outlet (Holds LoginPage card or ForgotPassword card) */}
        <div style={{
          flex: '0 1 440px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Outlet />
        </div>
      </div>

      <style>{`
        .auth-feature-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }
        .auth-feature-icon-wrap {
          width: 62px;
          height: 62px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .auth-feature-box:hover .auth-feature-icon-wrap {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.2);
        }
        .auth-feature-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.35;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
        }
        @media (max-width: 600px) {
          .auth-feature-label {
            font-size: 0.75rem;
          }
          .auth-feature-icon-wrap {
            width: 52px;
            height: 52px;
          }
        }
      `}</style>
    </div>
  );
}
