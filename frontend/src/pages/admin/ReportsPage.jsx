import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { Download, Filter, Search, FileText, Table } from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('detailed'); // 'detailed' | 'summary_by_student'
  const [data, setData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const { showError, showSuccess } = useToast();

  const fetchFilters = async () => {
    try {
      const [resC, resS] = await Promise.all([api.get('/classes'), api.get('/subjects')]);
      if (resC.data && resC.data.success) setClasses(resC.data.data);
      if (resS.data && resS.data.success) setSubjects(resS.data.data);
    } catch {
      // ignore
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports', {
        params: {
          type: reportType,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          classId: classId || undefined,
          subjectId: subjectId || undefined,
          status: status || undefined
        }
      });
      if (res.data && res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      showError('Failed to generate attendance report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, classId, subjectId, status]);

  // Export CSV
  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      showError('No report data to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    let headers = [];

    if (reportType === 'summary_by_student') {
      headers = ['Student ID', 'Roll No', 'Name', 'Email', 'Class', 'Section', 'Total Sessions', 'Present', 'Absent', 'Late', 'Attendance %'];
      csvContent += headers.join(',') + '\r\n';
      data.forEach((row) => {
        const line = [
          `"${row.student_code || ''}"`,
          `"${row.roll_number || ''}"`,
          `"${row.full_name || ''}"`,
          `"${row.email || ''}"`,
          `"${row.class_name || ''}"`,
          `"${row.section || ''}"`,
          row.total_sessions || 0,
          row.present_count || 0,
          row.absent_count || 0,
          row.late_count || 0,
          `${row.attendance_percentage}%`
        ];
        csvContent += line.join(',') + '\r\n';
      });
    } else {
      headers = ['Session Date', 'Class', 'Section', 'Subject', 'Teacher', 'Roll No', 'Student Name', 'Status', 'Method', 'Similarity %', 'Time'];
      csvContent += headers.join(',') + '\r\n';
      data.forEach((row) => {
        const line = [
          `"${row.session_date ? row.session_date.split('T')[0] : ''}"`,
          `"${row.class_name || ''}"`,
          `"${row.section || ''}"`,
          `"${row.subject_code || ''} - ${row.subject_name || ''}"`,
          `"${row.teacher_name || ''}"`,
          `"${row.roll_number || ''}"`,
          `"${row.student_name || ''}"`,
          `"${row.status || ''}"`,
          `"${row.recognition_method || ''}"`,
          `"${row.similarity_score ? (Number(row.similarity_score) * 100).toFixed(1) + '%' : '-'}"`,
          `"${row.marked_at ? new Date(row.marked_at).toLocaleTimeString() : ''}"`
        ];
        csvContent += line.join(',') + '\r\n';
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('CSV export downloaded successfully.');
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Reports & Exports</h1>
          <p className="page-subtitle">Generate granular session reports, student aggregates, threshold analytics, and spreadsheet exports.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportCSV} className="btn btn-primary btn-sm">
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setReportType('detailed')}
          className={`btn btn-sm ${reportType === 'detailed' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Table size={16} /> Detailed Session Logs
        </button>
        <button
          onClick={() => setReportType('summary_by_student')}
          className={`btn btn-sm ${reportType === 'summary_by_student' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FileText size={16} /> Student Attendance Summary
        </button>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar">
        <div className="filter-item">
          <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.8125rem' }}
          />
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.8125rem' }}
          />
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Class Cohort</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.8125rem' }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name} ({c.section})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.8125rem' }}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subject_code} - {s.subject_name}
              </option>
            ))}
          </select>
        </div>

        {reportType === 'detailed' && (
          <div className="filter-item">
            <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="LATE">LATE</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={fetchReport} className="btn btn-secondary btn-sm" style={{ height: '36px' }}>
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {/* Report Table */}
      {loading ? (
        <LoadingSkeleton rows={6} height="52px" />
      ) : data.length === 0 ? (
        <EmptyState title="No Attendance Logs" message="No records found matching your specified report parameters." />
      ) : reportType === 'summary_by_student' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Class</th>
                <th>Sessions</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Late</th>
                <th>Attendance %</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const pct = Number(row.attendance_percentage || 0);
                const isLow = pct < Number(row.low_attendance_threshold || 75);
                return (
                  <tr key={row.student_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.student_code}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.roll_number}</span>
                    </td>
                    <td>{row.class_name} ({row.section})</td>
                    <td>{row.total_sessions}</td>
                    <td><span style={{ color: '#059669', fontWeight: 700 }}>{row.present_count}</span></td>
                    <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{row.absent_count}</span></td>
                    <td><span>{row.late_count}</span></td>
                    <td>
                      <span style={{ fontWeight: 800, color: isLow ? '#ef4444' : '#059669' }}>
                        {pct}%
                      </span>
                    </td>
                    <td>
                      {isLow ? (
                        <Badge status="ERROR" label="LOW ATTENDANCE" />
                      ) : (
                        <Badge status="SUCCESS" label="GOOD STANDING" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Student</th>
                <th>Status</th>
                <th>Method</th>
                <th>AI Similarity</th>
                <th>Marked At</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(row.session_date).toLocaleDateString()}
                  </td>
                  <td>{row.class_name} ({row.section})</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.subject_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.subject_code}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.student_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Roll: {row.roll_number || row.student_code}</div>
                  </td>
                  <td>
                    <Badge status={row.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: row.recognition_method === 'AI' ? '#059669' : '#64748b' }}>
                      {row.recognition_method}
                    </span>
                  </td>
                  <td>
                    {row.similarity_score ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: row.similarity_score >= 0.36 ? '#059669' : '#dc2626' }}>
                        {(Number(row.similarity_score) * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(row.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
