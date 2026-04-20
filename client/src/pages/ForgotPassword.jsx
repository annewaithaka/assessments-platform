// client/src/pages/ForgotPassword.jsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      // We show a success message regardless of whether the email 
      // exists — matching the server's behavior for security.
    } catch (err) {
      setError(
        err.response?.data?.error || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // After submission, show a confirmation message instead of the form
  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Check Your Email</h2>
          <p style={styles.message}>
            If an account with <strong>{email}</strong> exists, we've sent a 
            password reset link. Check your inbox (and spam folder).
          </p>
          <p style={styles.devNote}>
            <strong>Dev note:</strong> Check your Flask terminal for the reset 
            link if email isn't configured yet.
          </p>
          <Link to="/login" style={styles.backLink}>
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Forgot Password</h2>
        <p style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <Link to="/login" style={styles.backLink}>
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '420px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 24px 0',
    color: '#666',
    textAlign: 'center',
    fontSize: '14px',
  },
  message: {
    color: '#333',
    textAlign: 'center',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  devNote: {
    backgroundColor: '#fffbeb',
    color: '#92400e',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #fde68a',
    marginBottom: '16px',
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
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
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
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '20px',
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

export default ForgotPassword;