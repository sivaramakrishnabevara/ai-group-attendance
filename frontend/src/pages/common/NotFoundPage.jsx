import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.25rem'
      }}>
        <AlertCircle size={36} />
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#475569', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '420px', marginBottom: '1.5rem' }}>
        The page you are looking for doesn't exist or you don't have authorization to access it.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={18} /> Return to Home
      </Link>
    </div>
  );
}
