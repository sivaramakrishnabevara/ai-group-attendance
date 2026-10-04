import React from 'react';

export default function LoadingSkeleton({ rows = 4, height = '48px', style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', ...style }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton"
          style={{
            height,
            width: '100%'
          }}
        />
      ))}
    </div>
  );
}
