// client/src/pages/AdminPayments.jsx

/*
  Admin payment management page.
  
  Shows all payments with filtering by status. The admin can 
  verify or reject pending payments from here.
  
  The table format makes it easy to scan through many payments 
  quickly — more efficient than cards for data-heavy views.
*/

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AdminPayments() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/admin/payments'
        : `/admin/payments?status=${filter}`;
      const response = await api.get(url);
      setPayments(response.data.payments);
      setError('');
    } catch (err) {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (paymentId) => {
    setActionLoading(paymentId);
    try {
      await api.put(`/admin/payments/${paymentId}/verify`);
      // Update local state
      setPayments(prev =>
        prev.map(p =>
          p.id === paymentId
            ? { ...p, status: 'verified', verified_at: new Date().toISOString() }
            : p
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to verify payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (paymentId) => {
    if (!window.confirm('Reject this payment?')) return;

    setActionLoading(paymentId);
    try {
      await api.put(`/admin/payments/${paymentId}/reject`);
      setPayments(prev =>
        prev.map(p =>
          p.id === paymentId ? { ...p, status: 'rejected' } : p
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject payment');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusStyle = (status) => {
    const map = {
      pending: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
      verified: { bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
      rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    };
    return map[status] || map.pending;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={styles.backBtn}
          >
            ← Back to Dashboard
          </button>
          <h1 style={styles.title}>Payment Management</h1>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {['pending', 'verified', 'rejected', 'all'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterBtn,
              backgroundColor: filter === status ? '#4f46e5' : '#fff',
              color: filter === status ? '#fff' : '#333',
              border: filter === status ? '1px solid #4f46e5' : '1px solid #ddd',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <p>Loading payments...</p>
      ) : payments.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No {filter === 'all' ? '' : filter} payments found.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Assessment</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => {
                const statusStyle = getStatusStyle(payment.status);
                return (
                  <tr key={payment.id} style={styles.tr}>
                    <td style={styles.td}>{payment.user_name}</td>
                    <td style={styles.td}>{payment.assessment_title}</td>
                    <td style={styles.td}>
                      KES {payment.amount.toLocaleString()}
                    </td>
                    <td style={styles.td}>
                      <code style={styles.refCode}>{payment.payment_reference}</code>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {formatDate(payment.created_at)}
                    </td>
                    <td style={styles.td}>
                      {payment.status === 'pending' ? (
                        <div style={styles.actionBtns}>
                          <button
                            onClick={() => handleVerify(payment.id)}
                            disabled={actionLoading === payment.id}
                            style={styles.verifyBtn}
                          >
                            {actionLoading === payment.id ? '...' : '✓ Verify'}
                          </button>
                          <button
                            onClick={() => handleReject(payment.id)}
                            disabled={actionLoading === payment.id}
                            style={styles.rejectBtn}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontSize: '13px' }}>
                          {payment.status === 'verified' ? 'Verified' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    marginBottom: '20px',
  },
  backBtn: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '12px',
    color: '#333',
  },
  title: {
    margin: 0,
    fontSize: '28px',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: '600',
    color: '#555',
    fontSize: '13px',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f0f0f0',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
  },
  refCode: {
    backgroundColor: '#f3f4f6',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionBtns: {
    display: 'flex',
    gap: '6px',
  },
  verifyBtn: {
    padding: '5px 12px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    border: '1px solid #86efac',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  rejectBtn: {
    padding: '5px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '2px dashed #ddd',
    color: '#666',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
};

export default AdminPayments;