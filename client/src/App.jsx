// client/src/App.jsx

/*
  Now we're making our first real API call.
  
  Key concepts introduced here:
  
  1. useState — React's way of storing data that can change.
     When you call setStatus(...), React re-renders the component 
     with the new data. This is called "reactivity."
  
  2. useEffect — Runs code AFTER the component renders.
     The empty array [] means "run this once when the component 
     first appears." Without it, the API call would run on every 
     single re-render — an infinite loop.
  
  3. async/await — Modern way to handle asynchronous operations 
     (like API calls). The code reads top-to-bottom instead of 
     being nested in .then().then().then() callbacks.
*/

import { useState, useEffect } from 'react';
import api from './api/axios';

function App() {
  // State variables — each one triggers a re-render when updated
  const [status, setStatus] = useState(null);    // API response data
  const [loading, setLoading] = useState(true);   // Show loading state
  const [error, setError] = useState(null);       // Store any errors

  useEffect(() => {
    // Define an async function inside useEffect
    // (useEffect itself can't be async — React rule)
    const checkBackend = async () => {
      try {
        const response = await api.get('/status');
        // api.get('/status') calls http://localhost:5000/api/status
        // because we set baseURL in axios.js
        setStatus(response.data);
        setLoading(false);
      } catch (err) {
        // This catches network errors, CORS issues, server down, etc.
        setError(
          'Cannot reach the backend. Is Flask running on port 5000?'
        );
        setLoading(false);
        console.error('API Error:', err);
      }
    };

    checkBackend();
  }, []);  // Empty dependency array = run once on mount

  // Conditional rendering — show different UI based on state
  // This pattern is everywhere in React
  if (loading) {
    return <div style={styles.container}><p>Connecting to backend...</p></div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1>⚠️ Connection Error</h1>
        <p style={styles.error}>{error}</p>
        <p>Make sure you've run <code>python run.py</code> in the server folder.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Assessments Platform</h1>
      <p>Frontend and backend are connected! 🚀</p>

      <div style={styles.statusCard}>
        <h3>Backend Status</h3>
        <p><strong>API Status:</strong> {status.status}</p>
        <p><strong>Database:</strong> {status.database}</p>
        <p><strong>Users:</strong> {status.users_count}</p>
        <p><strong>Assessments:</strong> {status.assessments_count}</p>
      </div>
    </div>
  );
}

/*
  Inline styles for now. We'll move to proper CSS (or Tailwind) 
  in Phase 2 when we build real pages. For a quick test like this, 
  inline styles keep everything in one file.
*/
const styles = {
  container: {
    maxWidth: '600px',
    margin: '50px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
  },
  statusCard: {
    marginTop: '20px',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
    textAlign: 'left',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
};

export default App;