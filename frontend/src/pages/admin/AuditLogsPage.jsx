import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { ShieldCheck, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      if (res.data && res.data.success) {
        setLogs(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const term = search.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.description && l.description.toLowerCase().includes(term)) ||
      (l.full_name && l.full_name.toLowerCase().includes(term)) ||
      (l.email && l.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Security & Audit Logs</h1>
          <p className="page-subtitle">Immutable records of authentication, attendance updates, biometric enrollments, and administrative actions.</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-item" style={{ flex: 2 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search audit trail by user, action, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} height="52px" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No Audit Logs" message="No audit records match your search." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Initiator</th>
                <th>Description</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <Badge status="INFO" label={log.action} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.full_name || 'System Operator'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.email || 'N/A'}</div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#334155' }}>
                    {log.description}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#64748b' }}>
                      {log.ip_address || '127.0.0.1'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
