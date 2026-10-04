import React from 'react';

export default function StatCard({ label, value, icon: Icon, color = '#059669', bgLight = '#ecfdf5', change, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {change && (
          <div style={{ fontSize: '0.75rem', color: change.startsWith('+') ? '#059669' : '#dc2626', marginTop: '4px', fontWeight: 600 }}>
            {change}
          </div>
        )}
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>
      {Icon && (
        <div className="stat-icon" style={{ backgroundColor: bgLight, color }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}
