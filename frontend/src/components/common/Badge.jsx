import React from 'react';

export default function Badge({ status, label, children, size = 'md' }) {
  const text = label || children || status;
  const normalized = String(status || text).toUpperCase();

  let badgeClass = 'badge-neutral';

  if (['PRESENT', 'SUCCESS', 'ACTIVE', 'COMPLETED', 'FINALIZED'].includes(normalized)) {
    badgeClass = 'badge-present';
  } else if (['ABSENT', 'ERROR', 'FAILED', 'INACTIVE', 'CANCELLED', 'DELETED'].includes(normalized)) {
    badgeClass = 'badge-absent';
  } else if (['UNKNOWN', 'PENDING', 'WARNING', 'SUBMITTED', 'PROCESSING', 'LATE'].includes(normalized)) {
    badgeClass = 'badge-unknown';
  } else if (['INFO', 'OPEN', 'REVIEWED', 'AI', 'MANUAL', 'EXCUSED'].includes(normalized)) {
    badgeClass = 'badge-info';
  }

  const fontSize = size === 'sm' ? '0.7rem' : size === 'lg' ? '0.85rem' : '0.75rem';
  const padding = size === 'sm' ? '2px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';

  return (
    <span className={`badge ${badgeClass}`} style={{ fontSize, padding }}>
      {text}
    </span>
  );
}
