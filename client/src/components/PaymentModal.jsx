// client/src/components/PaymentModal.jsx

/*
  Modal where users submit their payment reference.
  
  The flow:
  1. User clicks "Pay Now" on an assessment
  2. This modal opens showing the assessment name and price
  3. User pays via M-Pesa/bank (outside the app)
  4. User enters the transaction reference code here
  5. Submits → payment goes to "pending" status
  6. Admin verifies later
*/

import { useState } from 'react';
import api from '../api/axios';

function PaymentModal({ assessment, onClose, onSuccess }) {
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reference.trim()) {
      setError('Payment reference is required');
      return;
    }

    setLoading(true);

    try {
      await api.post('/payments', {
        assessment_id: assessment.id,
        payment_reference: reference.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to submit payment'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Payment</h2>

        <div style={styles.assessmentInfo}>
          <h3 style={styles.assessmentTitle}>{assessment.title}</h3>
          <p style={styles.price}>KES {assessment.price.toLocaleString()}</p>
        </div>

        <div style={styles.instructions}>
          <h4 style={styles.instructionsTitle}>How to pay:</h4>
          <p style={styles.step}>1. Send <strong>KES {assessment.price.toLocaleString()}</strong> via M-Pesa to: <strong>0798920710</strong></p>
          <p style={styles.step}>2. You will receive a confirmation SMS with a transaction code</p>
          <p style={styles.step}>3. Enter the transaction code below and submit</p>
          <p style={styles.step}>4. Your payment will be verified by our admin team</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Payment Reference / M-Pesa Code *</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              style={styles.input}
              placeholder="e.g., QBH123XYZ9"
              required
            />
            <small style={styles.hint}>
              Enter the transaction code from your M-Pesa confirmation SMS
            </small>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Submitting...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '22px',
  },
  assessmentInfo: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assessmentTitle: {
    margin: 0,
    fontSize: '16px',
  },
  price: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#4f46e5',
  },
  instructions: {
    backgroundColor: '#eff6ff',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #bfdbfe',
  },
  instructionsTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#1e40af',
  },
  step: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#1e3a5f',
    lineHeight: '1.5',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
    outline: 'none',
    letterSpacing: '1px',
    fontFamily: 'monospace',
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    border: '1px solid #fecaca',
  },
};

export default PaymentModal;