// client/src/pages/AssessmentManager.jsx

/*
  The question management page for a single assessment.
  
  Shows:
  1. Assessment details at the top (title, duration, price, status)
  2. List of existing questions with edit/delete actions
  3. A form to add new questions at the bottom
  
  The admin workflow:
  - Creates an assessment on the dashboard
  - Clicks "Manage Questions" to come here
  - Adds questions one by one
  - Goes back to dashboard and publishes the assessment
*/

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import QuestionForm from '../components/QuestionForm';

function AssessmentManager() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const response = await api.get(`/admin/assessments/${id}`);
      setAssessment(response.data.assessment);
      setQuestions(response.data.assessment.questions || []);
      setError('');
    } catch (err) {
      setError('Failed to load assessment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (formData) => {
    try {
      const response = await api.post(
        `/admin/assessments/${id}/questions`,
        formData
      );
      // Add the new question to local state
      setQuestions(prev => [...prev, response.data.question]);
      setShowAddForm(false);
      // Update question count on the assessment
      setAssessment(prev => ({
        ...prev,
        question_count: prev.question_count + 1,
      }));
    } catch (err) {
      throw err; // Let QuestionForm handle the error
    }
  };

  const handleEditQuestion = async (formData) => {
    try {
      const response = await api.put(
        `/admin/assessments/${id}/questions/${editingQuestion.id}`,
        formData
      );
      // Update the question in local state
      setQuestions(prev =>
        prev.map(q =>
          q.id === editingQuestion.id ? response.data.question : q
        )
      );
      setEditingQuestion(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;

    try {
      await api.delete(`/admin/assessments/${id}/questions/${questionId}`);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      setAssessment(prev => ({
        ...prev,
        question_count: prev.question_count - 1,
      }));
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  // Helper to get a readable label for question type
  const getTypeLabel = (type) => {
    const labels = {
      mcq: 'Multiple Choice',
      true_false: 'True / False',
      short_answer: 'Short Answer',
      likert: 'Behavioral / Likert',
    };
    return labels[type] || type;
  };

  // Helper to get badge color for question type
  const getTypeColor = (type) => {
    const colors = {
      mcq: { bg: '#ede9fe', text: '#7c3aed' },
      true_false: { bg: '#dbeafe', text: '#2563eb' },
      short_answer: { bg: '#fef3c7', text: '#d97706' },
      likert: { bg: '#fce7f3', text: '#db2777' },
    };
    return colors[type] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading assessment...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'Assessment not found'}</div>
        <button onClick={() => navigate('/admin/dashboard')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/dashboard')}
        style={styles.backBtn}
      >
        ← Back to Dashboard
      </button>

      {/* Assessment Header */}
      <div style={styles.assessmentHeader}>
        <div>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>{assessment.title}</h1>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: assessment.is_active ? '#dcfce7' : '#fef3c7',
                color: assessment.is_active ? '#16a34a' : '#d97706',
              }}
            >
              {assessment.is_active ? 'Published' : 'Draft'}
            </span>
          </div>
          {assessment.description && (
            <p style={styles.description}>{assessment.description}</p>
          )}
        </div>
        <div style={styles.metaRow}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Duration</span>
            <span style={styles.metaValue}>{assessment.duration_minutes} min</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Price</span>
            <span style={styles.metaValue}>KES {assessment.price.toLocaleString()}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Questions</span>
            <span style={styles.metaValue}>{questions.length}</span>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Questions</h2>
          {!showAddForm && !editingQuestion && (
            <button
              onClick={() => setShowAddForm(true)}
              style={styles.addBtn}
            >
              + Add Question
            </button>
          )}
        </div>

        {questions.length === 0 && !showAddForm ? (
          <div style={styles.emptyState}>
            <p>No questions yet. Add your first question to get started.</p>
            <button
              onClick={() => setShowAddForm(true)}
              style={styles.addBtn}
            >
              + Add Question
            </button>
          </div>
        ) : (
          <div>
            {questions.map((question, index) => (
              <div key={question.id}>
                {/* If editing this question, show the form */}
                {editingQuestion?.id === question.id ? (
                  <QuestionForm
                    question={question}
                    onSubmit={handleEditQuestion}
                    onCancel={() => setEditingQuestion(null)}
                  />
                ) : (
                  /* Otherwise show the question card */
                  <div style={styles.questionCard}>
                    <div style={styles.questionHeader}>
                      <div style={styles.questionNumber}>
                        Q{index + 1}
                      </div>
                      <span
                        style={{
                          ...styles.typeBadge,
                          backgroundColor: getTypeColor(question.question_type).bg,
                          color: getTypeColor(question.question_type).text,
                        }}
                      >
                        {getTypeLabel(question.question_type)}
                      </span>
                      <span style={styles.pointsBadge}>
                        {question.points} {question.points === 1 ? 'pt' : 'pts'}
                      </span>
                      <div style={styles.questionActions}>
                        <button
                          onClick={() => {
                            setShowAddForm(false);
                            setEditingQuestion(question);
                          }}
                          style={styles.editBtn}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          style={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p style={styles.questionText}>{question.question_text}</p>

                    {/* Show options for MCQ */}
                    {question.question_type === 'mcq' && question.options && (
                      <div style={styles.optionsList}>
                        {question.options.map((opt, i) => (
                          <div
                            key={i}
                            style={{
                              ...styles.optionItem,
                              backgroundColor:
                                opt === question.correct_answer
                                  ? '#dcfce7'
                                  : '#f9fafb',
                              borderColor:
                                opt === question.correct_answer
                                  ? '#86efac'
                                  : '#e5e7eb',
                            }}
                          >
                            {opt === question.correct_answer && (
                              <span style={styles.checkmark}>✓</span>
                            )}
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show answer for True/False */}
                    {question.question_type === 'true_false' && (
                      <p style={styles.answerDisplay}>
                        Correct answer:{' '}
                        <strong style={{ color: question.correct_answer === 'true' ? '#16a34a' : '#dc2626' }}>
                          {question.correct_answer === 'true' ? 'True' : 'False'}
                        </strong>
                      </p>
                    )}

                    {/* Show answer for Short Answer */}
                    {question.question_type === 'short_answer' && (
                      <p style={styles.answerDisplay}>
                        Expected answer: <strong>{question.correct_answer}</strong>
                      </p>
                    )}

                    {/* Likert — no correct answer */}
                    {question.question_type === 'likert' && (
                      <p style={{ ...styles.answerDisplay, color: '#7c3aed', fontStyle: 'italic' }}>
                        Behavioral question — no correct answer (not graded)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Question Form */}
        {showAddForm && (
          <QuestionForm
            question={null}
            onSubmit={handleAddQuestion}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  },
  backBtn: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '20px',
    color: '#333',
  },
  assessmentHeader: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  description: {
    margin: '8px 0 0 0',
    color: '#666',
    fontSize: '14px',
  },
  metaRow: {
    display: 'flex',
    gap: '32px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  metaValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
  },
  addBtn: {
    padding: '8px 16px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '2px dashed #ddd',
    color: '#666',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    marginBottom: '12px',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  questionNumber: {
    backgroundColor: '#4f46e5',
    color: '#fff',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0,
  },
  typeBadge: {
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
  },
  pointsBadge: {
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  questionActions: {
    marginLeft: 'auto',
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '4px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '13px',
  },
  deleteBtn: {
    padding: '4px 12px',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '13px',
  },
  questionText: {
    margin: '0 0 12px 0',
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#333',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  optionItem: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkmark: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: '16px',
  },
  answerDisplay: {
    margin: 0,
    fontSize: '14px',
    color: '#555',
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

export default AssessmentManager;