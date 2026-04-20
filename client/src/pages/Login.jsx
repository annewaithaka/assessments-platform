// client/src/pages/Login.jsx

import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  // Form state — each input gets its own state variable
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const successMessage = location.state?.message;

  // Hooks
  const { login } = useAuth();          // Get the login function from context
  const navigate = useNavigate();        // Programmatic navigation
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    // e.preventDefault() stops the browser's default form behavior,
    // which is to reload the entire page. In a React app, we handle
    // form submissions with JavaScript, not full page reloads.

    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);

      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // err.response?.data?.error is how axios structures errors.
      // The ?. is "optional chaining" — if response or data is
      // undefined, it returns undefined instead of crashing.
      setError(
        err.response?.data?.error || 'Login failed. Please try again.'
      );
    } finally {
      // finally runs whether the try succeeded or failed.
      // We always want to stop the loading spinner.
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Log In</h2>
        <p style={styles.subtitle}>Welcome back to Cognos </p>

        {successMessage && <div style={styles.success}>{successMessage}</div>}
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

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
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
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Register here
          </Link>
        </p>

        <p style={styles.footer}>
          <Link to="/forgot-password" style={styles.link}>
            Forgot your password?
          </Link>
        </p>
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
  success: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    border: '1px solid #bbf7d0',
  },
  footer: {
    textAlign: 'center',
    marginTop: '16px',
    fontSize: '14px',
    color: '#666',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: '600',
  },
};

export default Login;