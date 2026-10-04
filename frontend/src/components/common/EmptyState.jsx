import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No records found', message = 'There is currently no data to display.', action, icon: Icon = Inbox }) {
  return (
    <div style={{
      padding: '3rem 1.5rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px dashed #cbd5e1',
      margin: '1rem 0'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        marginBottom: '1rem'
      }}>
        <Icon size={28} />
      </div>
      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>{title}</h4>
      <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '380px', marginBottom: action ? '1.25rem' : 0 }}>
        {message}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
