// client/src/pages/Certificate.jsx

/*
  Certificate download page.
  
  This page can be reached from:
  1. The "Download Certificate" button on the Results page
  2. Direct URL: /certificate/:attemptId
  
  It fetches the attempt details to show a preview, then 
  provides a download button that calls the certificate API.
*/

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Certificate() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  const fetchAttempt = async () => {
    try {
      const response = await api.get(`/attempts/${attemptId}/results`);
      setAttempt(response.data.attempt);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load attempt details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Request the PDF as a blob (binary data)
      // By default, axios expects JSON. For files, we need 
      // responseType: 'blob' to get raw binary data.
      const response = await api.get(`/certificates/${attemptId}`, {
        responseType: 'blob',
      });

      // Create a download link programmatically
      // This technique creates an invisible <a> tag, sets its href 
      // to the blob URL, triggers a click, then cleans up.
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Certificate_${attempt.assessment_title.replace(/\s+/g, '_')}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      // revokeObjectURL frees the memory used by the blob URL
    } catch (err) {
      setError('Failed to download certificate. Please try again.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const getPercentage = () => {
    if (!attempt || !attempt.max_score) return 0;
    return Math.round((attempt.score / attempt.max_score) * 100);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading certificate details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Certificate Preview */}
        <div style={styles.preview}>
          <div style={styles.previewInner}>
            <p style={styles.previewOrg}>ASSESSMENTS PLATFORM</p>
            <h2 style={styles.previewTitle}>Certificate of Completion</h2>
            <div style={styles.divider} />
            <p style={styles.previewLabel}>This certifies that</p>
            <h1 style={styles.previewName}>{attempt.assessment_title}</h1>
            <p style={styles.previewScore}>
              Score: {attempt.score}/{attempt.max_score} ({getPercentage()}%)
            </p>
            <p style={styles.previewDate}>
              Completed: {new Date(attempt.end_time).toLocaleDateString('en-KE', {
                dateStyle: 'long',
              })}
            </p>
            <p style={styles.previewId}>
              Certificate ID: CERT-{String(attempt.id).padStart(4, '0')}-{String(attempt.user_id).padStart(4, '0')}
            </p>
          </div>
        </div>

        {/* Download Button */}
        <div style={styles.actions}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              ...styles.downloadBtn,
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? 'Generating PDF...' : 'Download Certificate (PDF)'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={styles.backBtn}
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/results/${attemptId}`)}
            style={styles.backBtn}
          >
            View Detailed Results
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '40px auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  preview: {
    backgroundColor: '#f8fafc',
    padding: '40px',
    borderBottom: '1px solid #e5e7eb',
  },
  previewInner: {
    border: '3px solid #4f46e5',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    backgroundColor: '#fff',
    position: 'relative',
  },
  previewOrg: {
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '2px',
    marginBottom: '8px',
  },
  previewTitle: {
    color: '#1f2937',
    fontSize: '22px',
    margin: '0 0 16px 0',
  },
  divider: {
    width: '80px',
    height: '3px',
    backgroundColor: '#d97706',
    margin: '0 auto 16px',
    borderRadius: '2px',
  },
  previewLabel: {
    color: '#6b7280',
    fontSize: '13px',
    marginBottom: '4px',
  },
  previewName: {
    color: '#3730a3',
    fontSize: '24px',
    margin: '8px 0 16px',
  },
  previewScore: {
    color: '#4b5563',
    fontSize: '14px',
    marginBottom: '4px',
  },
  previewDate: {
    color: '#6b7280',
    fontSize: '13px',
    marginBottom: '12px',
  },
  previewId: {
    color: '#9ca3af',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  actions: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
  },
  downloadBtn: {
    width: '100%',
    maxWidth: '350px',
    padding: '14px 24px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  backBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
};

export default Certificate;