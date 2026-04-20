// client/src/pages/Results.jsx

/*
  Shows the results after completing an assessment.
  
  Displays:
  - Overall score and percentage
  - Each question with the user's answer vs correct answer
  - Color coding: green for correct, red for incorrect
  - A download certificate button (built in Phase 6)
*/

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

function Results() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const timedOut = location.state?.timedOut || false;

  const [attempt, setAttempt] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      const response = await api.get(`/attempts/${attemptId}/results`);
      setAttempt(response.data.attempt);
      setResults(response.data.results);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = () => {
    if (!attempt || !attempt.max_score) return 0;
    return Math.round((attempt.score / attempt.max_score) * 100);
  };

  const getScoreColor = () => {
    const pct = getPercentage();
    if (pct >= 80) return '#16a34a';  // Green
    if (pct >= 50) return '#d97706';  // Orange
    return '#dc2626';                  // Red
  };

  const getScoreMessage = () => {
    const pct = getPercentage();
    if (pct === 100) return 'Perfect score! Outstanding!';
    if (pct >= 80) return 'Great job! Well done!';
    if (pct >= 60) return 'Good effort! Room for improvement.';
    if (pct >= 40) return 'Keep practicing. You\'ll get there!';
    return 'Don\'t give up! Review the material and try again.';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading results...</p>
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
      {/* Timed Out Notice */}
      {timedOut && (
        <div style={styles.timedOutBanner}>
          ⏰ Time's up! Your test was automatically submitted.
        </div>
      )}

      {/* Score Card */}
      <div style={styles.scoreCard}>
        <h1 style={styles.title}>{attempt.assessment_title}</h1>
        <p style={styles.subtitle}>Assessment Complete</p>

        <div style={styles.scoreCircle}>
          <span style={{ ...styles.scoreNumber, color: getScoreColor() }}>
            {getPercentage()}%
          </span>
          <span style={styles.scoreLabel}>
            {attempt.score} / {attempt.max_score} points
          </span>
        </div>

        <p style={{ ...styles.scoreMessage, color: getScoreColor() }}>
          {getScoreMessage()}
        </p>

        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>
              {results.filter(r => r.is_correct).length}
            </span>
            <span style={styles.statLabel}>Correct</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>
              {results.filter(r => !r.is_correct && r.user_answer).length}
            </span>
            <span style={styles.statLabel}>Incorrect</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>
              {results.filter(r => !r.user_answer).length}
            </span>
            <span style={styles.statLabel}>Skipped</span>
          </div>
        </div>

        <div style={styles.actionBtns}>
          <button
            onClick={() => navigate('/dashboard')}
            style={styles.dashboardBtn}
          >
            ← Back to Dashboard
          </button>
          {/* Certificate button — we'll wire this up in Phase 6 */}
          <button
            onClick={() => navigate(`/certificate/${attemptId}`)}
            style={styles.certificateBtn}
          >
            Download Certificate
          </button>
        </div>
      </div>

      {/* Detailed Results */}
      <div style={styles.detailsSection}>
        <h2 style={styles.detailsTitle}>Question Breakdown</h2>

        {results.map((result, index) => (
          <div
            key={result.question_id}
            style={{
              ...styles.resultCard,
              borderLeftColor: result.is_correct
                ? '#16a34a'
                : result.user_answer
                  ? '#dc2626'
                  : '#d97706',
            }}
          >
            <div style={styles.resultHeader}>
              <span style={styles.questionNum}>Q{index + 1}</span>
              <span
                style={{
                  ...styles.resultBadge,
                  backgroundColor: result.is_correct
                    ? '#dcfce7'
                    : result.user_answer
                      ? '#fef2f2'
                      : '#fffbeb',
                  color: result.is_correct
                    ? '#16a34a'
                    : result.user_answer
                      ? '#dc2626'
                      : '#d97706',
                }}
              >
                {result.is_correct
                  ? `✓ Correct (+${result.points_earned})`
                  : result.user_answer
                    ? '✗ Incorrect'
                    : '— Skipped'}
              </span>
            </div>

            <p style={styles.resultQuestion}>{result.question_text}</p>

            {/* Show options for MCQ with highlighting */}
            {result.question_type === 'mcq' && result.options && (
              <div style={styles.resultOptions}>
                {result.options.map((opt, i) => {
                  const isCorrect = opt === result.correct_answer;
                  const isUserAnswer = opt === result.user_answer;
                  const isWrong = isUserAnswer && !isCorrect;

                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.resultOption,
                        backgroundColor: isCorrect
                          ? '#dcfce7'
                          : isWrong
                            ? '#fef2f2'
                            : '#f9fafb',
                        borderColor: isCorrect
                          ? '#86efac'
                          : isWrong
                            ? '#fecaca'
                            : '#e5e7eb',
                      }}
                    >
                      {isCorrect && '✓ '}
                      {isWrong && '✗ '}
                      {opt}
                      {isCorrect && !isUserAnswer && (
                        <span style={styles.correctLabel}> (correct answer)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* True/False and Short Answer results */}
            {result.question_type !== 'mcq' && (
              <div style={styles.answerComparison}>
                <div style={styles.answerRow}>
                  <span style={styles.answerLabel}>Your answer:</span>
                  <span
                    style={{
                      ...styles.answerValue,
                      color: result.is_correct ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {result.user_answer || '(no answer)'}
                  </span>
                </div>
                {!result.is_correct && (
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Correct answer:</span>
                    <span style={{ ...styles.answerValue, color: '#16a34a' }}>
                      {result.correct_answer}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  },
  timedOutBanner: {
    backgroundColor: '#fffbeb',
    color: '#92400e',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #fde68a',
    marginBottom: '20px',
    textAlign: 'center',
    fontWeight: '600',
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '24px',
  },
  subtitle: {
    margin: '0 0 24px 0',
    color: '#666',
    fontSize: '14px',
  },
  scoreCircle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '24px 0',
  },
  scoreNumber: {
    fontSize: '64px',
    fontWeight: '800',
    lineHeight: '1',
  },
  scoreLabel: {
    fontSize: '16px',
    color: '#888',
    marginTop: '8px',
  },
  scoreMessage: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '24px',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginBottom: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #f0f0f0',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  actionBtns: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  dashboardBtn: {
    padding: '12px 24px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  certificateBtn: {
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  // Detailed Results
  detailsSection: {
    marginBottom: '40px',
  },
  detailsTitle: {
    fontSize: '20px',
    marginBottom: '16px',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid',
    marginBottom: '12px',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  questionNum: {
    fontWeight: '700',
    fontSize: '14px',
    color: '#555',
  },
  resultBadge: {
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
  },
  resultQuestion: {
    margin: '0 0 12px 0',
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#333',
  },
  resultOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  resultOption: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
  },
  correctLabel: {
    fontSize: '12px',
    fontStyle: 'italic',
    color: '#16a34a',
  },
  answerComparison: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '8px',
  },
  answerRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '14px',
  },
  answerLabel: {
    color: '#666',
    fontWeight: '500',
  },
  answerValue: {
    fontWeight: '600',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
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
};

export default Results;