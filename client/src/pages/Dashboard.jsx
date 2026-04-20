// client/src/pages/Dashboard.jsx

/*
  The main user page — combines assessment catalog and payment status.
  
  Three sections:
  1. Header with user info and logout
  2. "My Assessments" — assessments the user has paid for, with status
  3. "Available Assessments" — all published assessments to browse
  
  For each assessment, the UI shows different actions based on 
  payment status:
  - No payment → "Pay Now" button
  - Pending → "Payment Pending" label
  - Verified → "Start Test" button
  - Rejected → "Payment Rejected" + "Try Again" button
*/

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PaymentModal from '../components/PaymentModal';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch both assessments and user's payments in parallel
      // Promise.all runs multiple async operations simultaneously 
      // instead of one after another — faster.
      const [assessmentsRes, paymentsRes] = await Promise.all([
        api.get('/assessments'),
        api.get('/payments/my'),
      ]);
      setAssessments(assessmentsRes.data.assessments);
      setPayments(paymentsRes.data.payments);
      setError('');
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: get payment status for a specific assessment
  const getPaymentForAssessment = (assessmentId) => {
    // Find the most recent non-rejected payment, or the most recent overall
    const assessmentPayments = payments
      .filter(p => p.assessment_id === assessmentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Prefer verified or pending over rejected
    const active = assessmentPayments.find(
      p => p.status === 'verified' || p.status === 'pending'
    );
    return active || assessmentPayments[0] || null;
  };

  const handlePaymentSuccess = () => {
    setSelectedAssessment(null);
    fetchData(); // Refresh to show updated payment status
  };

  // Separate assessments into "my assessments" (paid) and "available"
  const myAssessmentIds = payments
    .filter(p => p.status === 'verified' || p.status === 'pending')
    .map(p => p.assessment_id);

  const myAssessments = assessments.filter(a => myAssessmentIds.includes(a.id));
  const availableAssessments = assessments.filter(a => !myAssessmentIds.includes(a.id));

  // Render the action button based on payment status
  const renderActionButton = (assessment) => {
    const payment = getPaymentForAssessment(assessment.id);

    if (!payment || payment.status === 'rejected') {
      return (
        <div>
          {payment?.status === 'rejected' && (
            <p style={styles.rejectedText}>
              Payment was rejected. Please try again.
            </p>
          )}
          <button
            onClick={() => setSelectedAssessment(assessment)}
            style={styles.payBtn}
          >
            Pay Now — KES {assessment.price.toLocaleString()}
          </button>
        </div>
      );
    }

    if (payment.status === 'pending') {
      return (
        <div style={styles.pendingBadge}>
          ⏳ Payment Pending Verification
          <small style={styles.pendingHint}>
            Ref: {payment.payment_reference}
          </small>
        </div>
      );
    }

    if (payment.status === 'verified') {
      return (
        <button
          onClick={() => navigate(`/assessment/${assessment.id}/take`)}
          style={styles.startBtn}
        >
          Start Test →
        </button>
      );
    }

    return null;
  };

  if (loading) {
    return <div style={styles.container}><p>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Welcome back, {user?.name}</p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Log Out</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* My Assessments Section */}
      {myAssessments.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>My Assessments</h2>
          <div style={styles.grid}>
            {myAssessments.map(assessment => (
              <div key={assessment.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{assessment.title}</h3>
                <p style={styles.cardDesc}>
                  {assessment.description || 'No description'}
                </p>
                <div style={styles.cardMeta}>
                  <span>⏱ {assessment.duration_minutes} min</span>
                  <span>📝 {assessment.question_count} questions</span>
                </div>
                <div style={styles.cardAction}>
                  {renderActionButton(assessment)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Assessments Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          {myAssessments.length > 0 ? 'Other Available Assessments' : 'Available Assessments'}
        </h2>
        {availableAssessments.length === 0 ? (
          <div style={styles.emptyState}>
            <p>
              {assessments.length === 0
                ? 'No assessments available at the moment. Check back later!'
                : 'You\'ve already enrolled in all available assessments.'}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {availableAssessments.map(assessment => (
              <div key={assessment.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{assessment.title}</h3>
                <p style={styles.cardDesc}>
                  {assessment.description || 'No description'}
                </p>
                <div style={styles.cardMeta}>
                  <span>⏱ {assessment.duration_minutes} min</span>
                  <span>📝 {assessment.question_count} questions</span>
                </div>
                <div style={styles.cardAction}>
                  {renderActionButton(assessment)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedAssessment && (
        <PaymentModal
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          onSuccess={handlePaymentSuccess}
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
    marginBottom: '32px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#666',
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
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '16px',
    color: '#333',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#111',
  },
  cardDesc: {
    margin: '0 0 16px 0',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.4',
    flex: 1,
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
  cardAction: {
    marginTop: 'auto',
  },
  payBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  startBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
  },
  pendingBadge: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fde68a',
    color: '#92400e',
    fontSize: '14px',
    fontWeight: '600',
  },
  pendingHint: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '400',
    marginTop: '4px',
    color: '#b45309',
  },
  rejectedText: {
    fontSize: '13px',
    color: '#dc2626',
    marginBottom: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '2px dashed #ddd',
    color: '#666',
  },
};

export default Dashboard;