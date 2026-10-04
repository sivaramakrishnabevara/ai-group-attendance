import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', {
        params: { unreadOnly: unreadOnly || undefined }
      });
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
    } catch {
      showError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      showSuccess('Notification marked as read.');
    } catch {
      showError('Failed to mark notification.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      showSuccess('All notifications marked as read.');
    } catch {
      showError('Failed to update notifications.');
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '820px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Real-time attendance submissions, threshold alerts, and biometric updates.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`btn btn-sm ${unreadOnly ? 'btn-primary' : 'btn-secondary'}`}
          >
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </button>
          <button onClick={handleMarkAllRead} className="btn btn-secondary btn-sm">
            <CheckCheck size={16} /> Mark All Read
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} height="70px" />
      ) : notifications.length === 0 ? (
        <EmptyState title="No Notifications" message="You're all caught up! No active notices at this time." icon={Bell} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '1rem 1.25rem',
                borderLeft: `4px solid ${n.is_read ? '#cbd5e1' : '#059669'}`,
                backgroundColor: n.is_read ? '#ffffff' : '#f0fdf4',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{n.title}</h4>
                  <Badge status={n.type} size="sm" />
                  {!n.is_read && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  {n.message}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  title="Mark as read"
                >
                  <Check size={14} /> Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
