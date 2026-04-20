// client/src/pages/AdminDashboard.jsx

/*
  The admin's home page — lists all assessments with actions.
  
  Key patterns:
  - Fetching data on mount with useEffect
  - Conditional rendering based on loading/error/empty states
  - Calling API endpoints and updating local state to reflect changes
    without needing to refetch everything
*/

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AssessmentForm from '../components/AssessmentForm';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);

  // Fetch all assessments on mount
  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const response = await api.get('/admin/assessments');
      setAssessments(response.data.assessments);
      setError('');
    } catch (err) {
      setError('Failed to load assessments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAssessment(null);  // null means "create new"
    setShowForm(true);
  };

  const handleEdit = (assessment) => {
    setEditingAssessment(assessment);  // pass existing data to form
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingAssessment) {
        // Update existing
        await api.put(`/admin/assessments/${editingAssessment.id}`, formData);
      } else {
        // Create new
        await api.post('/admin/assessments', formData);
      }
      // Refresh the list after creating/editing
      await fetchAssessments();
      setShowForm(false);
      setEditingAssessment(null);
    } catch (err) {
      throw err;  // Let the form component handle the error display
    }
  };

  const handleDelete = async (assessmentId) => {
    // window.confirm shows a browser dialog asking "Are you sure?"
    // It returns true if the user clicks OK, false if they click Cancel.
    // Simple but effective — prevents accidental deletes.
    if (!window.confirm('Are you sure you want to delete this assessment? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/assessments/${assessmentId}`);
      // Remove from local state instead of refetching
      // This is faster and gives instant feedback
      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
    } catch (err) {
      alert('Failed to delete assessment');
      console.error(err);
    }
  };

  const handleTogglePublish = async (assessment) => {
    try {
      await api.put(`/admin/assessments/${assessment.id}`, {
        is_active: !assessment.is_active
      });
      // Update local state
      setAssessments(prev =>
        prev.map(a =>
          a.id === assessment.id
            ? { ...a, is_active: !a.is_active }
            : a
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update assessment');
    }
  };

  if (loading) {
    return <div style={styles.container}><p>Loading assessments...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>Welcome, {user?.name}</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleCreate} style={styles.createBtn}>
            + New Assessment
          </button>
          <button
            onClick={() => navigate('/admin/payments')}
            style={{
              ...styles.createBtn,
              backgroundColor: '#f59e0b',
            }}
          >
            Manage Payments
          </button>
          <button onClick={logout} style={styles.logoutBtn}>
            Log Out
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <div style={styles.emptyState}>
          <h3>No assessments yet</h3>
          <p>Create your first assessment to get started.</p>
          <button onClick={handleCreate} style={styles.createBtn}>
            + Create Assessment
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {assessments.map(assessment => (
            <div key={assessment.id} style={styles.card}>
              {/* Status badge */}
              <div style={styles.cardHeader}>
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: assessment.is_active ? '#dcfce7' : '#fef3c7',
                    color: assessment.is_active ? '#16a34a' : '#d97706',
                  }}
                >
                  {assessment.is_active ? 'Published' : 'Draft'}
                </span>
                <span style={styles.price}>KES {assessment.price.toLocaleString()}</span>
              </div>

              {/* Assessment info */}
              <h3 style={styles.cardTitle}>{assessment.title}</h3>
              <p style={styles.cardDesc}>
                {assessment.description || 'No description'}
              </p>

              <div style={styles.cardMeta}>
                <span>{assessment.duration_minutes} min</span>
                <span>{assessment.question_count} questions</span>
              </div>

              {/* Actions */}
              <div style={styles.cardActions}>
                <button
                  onClick={() => navigate(`/admin/assessments/${assessment.id}`)}
                  style={styles.actionBtn}
                >
                  Manage Questions
                </button>
                <button
                  onClick={() => handleEdit(assessment)}
                  style={styles.actionBtn}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleTogglePublish(assessment)}
                  style={{
                    ...styles.actionBtn,
                    color: assessment.is_active ? '#d97706' : '#16a34a',
                  }}
                >
                  {assessment.is_active ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => handleDelete(assessment.id)}
                  style={{ ...styles.actionBtn, color: '#dc2626' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assessment Form Modal */}
      {showForm && (
        <AssessmentForm
          assessment={editingAssessment}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingAssessment(null);
          }}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    margin: '0',
    fontSize: '28px',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#666',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  createBtn: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  logoutBtn: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '12px',
    border: '2px dashed #ddd',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  price: {
    fontWeight: '700',
    color: '#333',
    fontSize: '16px',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
  },
  cardDesc: {
    margin: '0 0 12px 0',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.4',
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#888',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f0f0f0',
  },
  cardActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#4f46e5',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
};

export default AdminDashboard;