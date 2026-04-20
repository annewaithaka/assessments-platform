// client/src/pages/TakeAssessment.jsx

/*
  The test-taking experience.
  
  Design decisions:
  - One question at a time (like TestGorilla) — less overwhelming 
    than showing everything at once
  - Answers auto-save when you click Next or select an option — 
    prevents data loss on crash/disconnect
  - Timer counts down in the header — always visible
  - Question navigator at the bottom — shows which are answered
  - Auto-submit when timer hits zero
  
  State management is critical here. We track:
  - The attempt (from the API)
  - All questions
  - User's answers (object: { questionId: answer })
  - Current question index
  - Time remaining
*/

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function TakeAssessment() {
  const { id } = useParams();  // assessment ID from URL
  const navigate = useNavigate();

  // Core state
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  // useRef keeps a value that persists across renders WITHOUT 
  // causing re-renders when it changes. Perfect for the timer 
  // interval ID — we need to clear it later but don't need 
  // the UI to update when the ID changes.
  const timerRef = useRef(null);
  const timeRef = useRef(0);
  // We keep a ref copy of timeRemaining because the timer callback 
  // captures the initial state value (closure). Without the ref, 
  // the auto-submit check would always see the initial value.

  // Start the assessment
  useEffect(() => {
    startAssessment();

    // Cleanup: clear timer when component unmounts
    // (e.g., user navigates away)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startAssessment = async () => {
    try {
      const response = await api.post('/attempts', {
        assessment_id: parseInt(id),
      });

      setAttempt(response.data.attempt);
      setQuestions(response.data.questions);
      setAnswers(response.data.answers || {});
      setTimeRemaining(response.data.time_remaining);
      timeRef.current = response.data.time_remaining;

      // Start the countdown timer
      startTimer(response.data.time_remaining);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to start assessment';
      setError(errorMsg);

      // If already completed, redirect to results
      if (errorMsg.includes('already completed')) {
        setTimeout(() => navigate('/dashboard'), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (seconds) => {
    timeRef.current = seconds;

    timerRef.current = setInterval(() => {
      timeRef.current -= 1;
      setTimeRemaining(timeRef.current);

      if (timeRef.current <= 0) {
        clearInterval(timerRef.current);
        handleAutoSubmit();
      }
    }, 1000);
    // setInterval runs the callback every 1000ms (1 second).
    // Each tick decrements the timer. At zero, we auto-submit.
  };

  const handleAutoSubmit = async () => {
    // Called when timer reaches zero
    setSubmitting(true);
    try {
      const response = await api.post(`/attempts/${attempt.id}/submit`);
      navigate(`/results/${response.data.attempt.id}`, {
        state: { timedOut: true }
      });
    } catch (err) {
      // Even if submit fails, navigate to dashboard
      navigate('/dashboard');
    }
  };

  // Save answer to the server
  const saveAnswer = useCallback(async (questionId, answer) => {
    if (!attempt) return;

    setSaving(true);
    try {
      await api.put(`/attempts/${attempt.id}/answer`, {
        question_id: questionId,
        answer: answer,
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
      // Don't show error to user for auto-save — it would be 
      // disruptive during a timed test. The answer is still in 
      // local state and will be retried on next save.
    } finally {
      setSaving(false);
    }
  }, [attempt]);
  // useCallback memoizes the function so it doesn't get recreated 
  // on every render. The dependency [attempt] means it only 
  // recreates when attempt changes.

  // Handle answer selection
  const handleAnswer = (questionId, answer) => {
    // Update local state immediately (instant feedback)
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    // Save to server (async, non-blocking)
    saveAnswer(questionId, answer);
  };

  // Navigation
  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Manual submit
  const handleSubmit = async () => {
    const unanswered = questions.filter(q => !answers[q.id]);

    if (unanswered.length > 0) {
      const confirm = window.confirm(
        `You have ${unanswered.length} unanswered question(s). Submit anyway?`
      );
      if (!confirm) return;
    } else {
      const confirm = window.confirm('Are you sure you want to submit?');
      if (!confirm) return;
    }

    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const response = await api.post(`/attempts/${attempt.id}/submit`);
      navigate(`/results/${response.data.attempt.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
      setSubmitting(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    // padStart(2, '0') ensures single digits get a leading zero: 5 → "05"
  };

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (timeRemaining <= 60) return '#dc2626';     // Red: last minute
    if (timeRemaining <= 300) return '#d97706';    // Orange: last 5 minutes
    return '#333';                                  // Normal
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <h2>Loading assessment...</h2>
        <p>Preparing your questions</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.error}>{error}</div>
        <button
          onClick={() => navigate('/dashboard')}
          style={styles.backBtn}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => answers[q.id]).length;

  return (
    <div style={styles.container}>
      {/* Top Bar — Timer + Progress */}
      <div style={styles.topBar}>
        <div style={styles.assessmentInfo}>
          <h3 style={styles.assessmentTitle}>{attempt?.assessment_title}</h3>
          <span style={styles.progress}>
            Question {currentIndex + 1} of {questions.length}
            {saving && <span style={styles.savingIndicator}> • Saving...</span>}
          </span>
        </div>
        <div style={styles.timerContainer}>
          <span
            style={{
              ...styles.timer,
              color: getTimerColor(),
            }}
          >
            ⏱ {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBarOuter}>
        <div
          style={{
            ...styles.progressBarInner,
            width: `${(answeredCount / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question Area */}
      <div style={styles.questionArea}>
        {/* Question Type Badge */}
        <div style={styles.questionMeta}>
          <span style={styles.typeBadge}>
            {currentQuestion.question_type === 'mcq' && 'Multiple Choice'}
            {currentQuestion.question_type === 'true_false' && 'True / False'}
            {currentQuestion.question_type === 'short_answer' && 'Short Answer'}
            {currentQuestion.question_type === 'likert' && 'Behavioral'}
          </span>
          <span style={styles.pointsBadge}>
            {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
          </span>
        </div>

        {/* Question Text */}
        <h2 style={styles.questionText}>{currentQuestion.question_text}</h2>

        {/* Answer Input — changes based on question type */}
        <div style={styles.answerArea}>
          {/* MCQ Options */}
          {currentQuestion.question_type === 'mcq' && (
            <div style={styles.optionsGrid}>
              {currentQuestion.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  style={{
                    ...styles.optionBtn,
                    backgroundColor:
                      answers[currentQuestion.id] === option
                        ? '#4f46e5'
                        : '#fff',
                    color:
                      answers[currentQuestion.id] === option
                        ? '#fff'
                        : '#333',
                    borderColor:
                      answers[currentQuestion.id] === option
                        ? '#4f46e5'
                        : '#ddd',
                  }}
                >
                  <span style={styles.optionLetter}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* True/False */}
          {currentQuestion.question_type === 'true_false' && (
            <div style={styles.tfContainer}>
              {['true', 'false'].map(value => (
                <button
                  key={value}
                  onClick={() => handleAnswer(currentQuestion.id, value)}
                  style={{
                    ...styles.tfBtn,
                    backgroundColor:
                      answers[currentQuestion.id] === value
                        ? value === 'true' ? '#16a34a' : '#dc2626'
                        : '#fff',
                    color:
                      answers[currentQuestion.id] === value
                        ? '#fff'
                        : '#333',
                    borderColor:
                      answers[currentQuestion.id] === value
                        ? value === 'true' ? '#16a34a' : '#dc2626'
                        : '#ddd',
                  }}
                >
                  {value === 'true' ? 'True' : 'False'}
                </button>
              ))}
            </div>
          )}

          {/* Likert Scale */}
          {currentQuestion.question_type === 'likert' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentQuestion.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    border: '2px solid',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    backgroundColor:
                      answers[currentQuestion.id] === option
                        ? '#7c3aed'
                        : '#fff',
                    color:
                      answers[currentQuestion.id] === option
                        ? '#fff'
                        : '#333',
                    borderColor:
                      answers[currentQuestion.id] === option
                        ? '#7c3aed'
                        : '#ddd',
                  }}
                >
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: answers[currentQuestion.id] === option
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Short Answer */}
          {currentQuestion.question_type === 'short_answer' && (
            <div>
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) =>
                  setAnswers(prev => ({
                    ...prev,
                    [currentQuestion.id]: e.target.value,
                  }))
                }
                onBlur={(e) => {
                  // Save when user clicks away from the input
                  // onBlur fires when the input loses focus
                  if (e.target.value) {
                    saveAnswer(currentQuestion.id, e.target.value);
                  }
                }}
                style={styles.textInput}
                placeholder="Type your answer here..."
              />
              <small style={styles.hint}>
                Press Next or click away to save your answer
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={styles.navBar}>
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          style={{
            ...styles.navBtn,
            opacity: currentIndex === 0 ? 0.4 : 1,
          }}
        >
          ← Previous
        </button>

        {/* Question Dots */}
        <div style={styles.dotsContainer}>
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => goToQuestion(i)}
              style={{
                ...styles.dot,
                backgroundColor:
                  i === currentIndex
                    ? '#4f46e5'
                    : answers[q.id]
                      ? '#16a34a'
                      : '#ddd',
                color:
                  i === currentIndex || answers[q.id] ? '#fff' : '#999',
              }}
              title={`Question ${i + 1}${answers[q.id] ? ' (answered)' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentIndex < questions.length - 1 ? (
          <button onClick={handleNext} style={styles.navBtn}>
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 24px',
    fontFamily: 'Arial, sans-serif',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    textAlign: 'center',
    marginTop: '100px',
    fontFamily: 'Arial, sans-serif',
  },
  // Top Bar
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  assessmentInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  assessmentTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#333',
  },
  progress: {
    fontSize: '13px',
    color: '#888',
    marginTop: '2px',
  },
  savingIndicator: {
    color: '#4f46e5',
    fontStyle: 'italic',
  },
  timerContainer: {
    textAlign: 'right',
  },
  timer: {
    fontSize: '28px',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Progress Bar
  progressBarOuter: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    marginBottom: '8px',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  // Question Area
  questionArea: {
    flex: 1,
    padding: '32px 0',
  },
  questionMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  typeBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
  },
  pointsBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  questionText: {
    fontSize: '22px',
    lineHeight: '1.5',
    color: '#111',
    marginBottom: '32px',
  },
  answerArea: {
    marginTop: '16px',
  },
  // MCQ
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    border: '2px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    backgroundColor: '#fff',
  },
  optionLetter: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: 'rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0,
  },
  // True/False
  tfContainer: {
    display: 'flex',
    gap: '16px',
  },
  tfBtn: {
    flex: 1,
    padding: '20px',
    border: '2px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    transition: 'all 0.15s ease',
  },
  // Short Answer
  textInput: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #ddd',
    borderRadius: '10px',
    fontSize: '16px',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'Arial, sans-serif',
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginTop: '8px',
  },
  // Navigation Bar
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0 24px',
    borderTop: '1px solid #e5e7eb',
    position: 'sticky',
    bottom: 0,
    backgroundColor: '#fff',
  },
  navBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  submitBtn: {
    padding: '10px 24px',
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  dotsContainer: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
    fontSize: '15px',
  },
  backBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    marginTop: '12px',
  },
};

export default TakeAssessment;