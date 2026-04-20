// client/src/components/QuestionForm.jsx

/*
  Dynamic question form that adapts based on question type.
  
  The trickiest part is the MCQ options builder — you need to 
  be able to add/remove options dynamically. We store them as 
  an array in state and render an input for each one.
  
  This same component handles both CREATE and EDIT:
  - If `question` prop is null → create mode
  - If `question` prop has data → edit mode (pre-filled)
*/

import { useState, useEffect } from 'react';

function QuestionForm({ question, onSubmit, onCancel }) {
  const isEditing = !!question;

  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('mcq');
  const [options, setOptions] = useState(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [points, setPoints] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (question) {
      setQuestionText(question.question_text);
      setQuestionType(question.question_type);
      setCorrectAnswer(question.correct_answer);
      setPoints(question.points);

      if (question.question_type === 'mcq' && question.options?.length > 0) {
        setOptions(question.options);
      }
      if (question.question_type === 'true_false') {
        setCorrectAnswer(question.correct_answer);
      }
    }
  }, [question]);

  // Reset form fields when question type changes (only in create mode)
  const handleTypeChange = (newType) => {
    setQuestionType(newType);
    setCorrectAnswer('');
    setError('');

    if (newType === 'mcq') {
      setOptions(['', '']);
    }
    if (newType === 'true_false') {
      setCorrectAnswer('true');
    }
    if (newType === 'likert') {
      // Pre-fill with common Likert defaults, but admin can 
      // add/remove/edit them just like MCQ options
      setOptions(['Never', 'Rarely', 'Sometimes', 'Often', 'Always']);
      setCorrectAnswer('N/A');
    }
  };

  // --- MCQ Options Management ---
  const addOption = () => {
    if (options.length >= 6) {
      setError('Maximum 6 options allowed');
      return;
    }
    setOptions([...options, '']);
    // Spread operator (...) creates a new array with all existing 
    // items plus an empty string at the end. We create a NEW array 
    // instead of modifying the existing one because React only 
    // re-renders when it detects a new reference, not mutations.
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      setError('Minimum 2 options required');
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);

    // If the removed option was the correct answer, clear it
    if (options[index] === correctAnswer) {
      setCorrectAnswer('');
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    // If this option was the correct answer, update correctAnswer too
    if (newOptions[index] === correctAnswer) {
      setCorrectAnswer(value);
    }
    newOptions[index] = value;
    setOptions(newOptions);
  };

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }

    if (questionType !== 'likert' && !correctAnswer.trim()) {
      setError('Correct answer is required');
      return;
    }

    if (questionType === 'mcq') {
      const filledOptions = options.filter(o => o.trim() !== '');
      if (filledOptions.length < 2) {
        setError('At least 2 options must be filled in');
        return;
      }
      if (!filledOptions.includes(correctAnswer)) {
        setError('Correct answer must be one of the options');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        question_text: questionText.trim(),
        question_type: questionType,
        correct_answer: questionType === 'likert' ? 'N/A' : correctAnswer.trim(),
        points: questionType === 'likert' ? 0 : (parseInt(points) || 1),
      };

      if (questionType === 'mcq' || questionType === 'likert') {
        payload.options = options.filter(o => o.trim() !== '');
      }

      await onSubmit(payload);

      // Reset form after successful create (not edit)
      if (!isEditing) {
        setQuestionText('');
        setCorrectAnswer(questionType === 'true_false' ? 'true' : '');
        setOptions(['', '']);
        setPoints(1);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        {isEditing ? 'Edit Question' : 'Add New Question'}
      </h3>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Question Text */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Question Text *</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            style={styles.textarea}
            placeholder="Enter your question..."
            rows={3}
            required
          />
        </div>

        {/* Question Type + Points Row */}
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Question Type *</label>
            <select
              value={questionType}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={styles.select}
              disabled={isEditing}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short Answer</option>
              <option value="likert">Behavioral / Likert Scale</option>
            </select>
            {isEditing && (
              <small style={styles.hint}>Type cannot be changed after creation</small>
            )}
          </div>

          <div style={{ ...styles.formGroup, maxWidth: '120px' }}>
            <label style={styles.label}>Points</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              style={styles.input}
              min="1"
              max="100"
            />
          </div>
        </div>

        {/* --- MCQ Options --- */}
        {questionType === 'mcq' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Options *</label>
            <small style={styles.hint}>
              Click the radio button next to the correct answer
            </small>
            {options.map((option, index) => (
              <div key={index} style={styles.optionRow}>
                {/* Radio button to select correct answer */}
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={correctAnswer === option && option !== ''}
                  onChange={() => setCorrectAnswer(option)}
                  style={styles.radio}
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  style={styles.optionInput}
                  placeholder={`Option ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  style={styles.removeBtn}
                  title="Remove option"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              style={styles.addOptionBtn}
            >
              + Add Option
            </button>
          </div>
        )}

        {/* --- True/False --- */}
        {questionType === 'true_false' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Correct Answer *</label>
            <div style={styles.tfRow}>
              <button
                type="button"
                onClick={() => setCorrectAnswer('true')}
                style={{
                  ...styles.tfBtn,
                  backgroundColor: correctAnswer === 'true' ? '#16a34a' : '#f5f5f5',
                  color: correctAnswer === 'true' ? '#fff' : '#333',
                  border: correctAnswer === 'true' ? '2px solid #16a34a' : '2px solid #ddd',
                }}
              >
                True
              </button>
              <button
                type="button"
                onClick={() => setCorrectAnswer('false')}
                style={{
                  ...styles.tfBtn,
                  backgroundColor: correctAnswer === 'false' ? '#dc2626' : '#f5f5f5',
                  color: correctAnswer === 'false' ? '#fff' : '#333',
                  border: correctAnswer === 'false' ? '2px solid #dc2626' : '2px solid #ddd',
                }}
              >
                False
              </button>
            </div>
          </div>
        )}

        {/* --- Likert Scale --- */}
        {questionType === 'likert' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Scale Options</label>
            <small style={styles.hint}>
              Customize the scale labels. You can add, remove, or edit them.
            </small>
            {options.map((option, index) => (
              <div key={index} style={styles.optionRow}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#ede9fe',
                  color: '#7c3aed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  flexShrink: 0,
                }}>
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  style={styles.optionInput}
                  placeholder={`Option ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  style={styles.removeBtn}
                  title="Remove option"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              style={styles.addOptionBtn}
            >
              + Add Option
            </button>
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #bbf7d0',
              fontSize: '12px',
              color: '#16a34a',
            }}>
              This question has no correct answer — it measures behavior/preference and won't affect the score.
            </div>
          </div>
        )}
      
        {/* --- Short Answer --- */}
        {questionType === 'short_answer' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Expected Answer *</label>
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              style={styles.input}
              placeholder="The exact answer (case-insensitive match)"
            />
            <small style={styles.hint}>
              The user's answer will be compared to this (case-insensitive)
            </small>
          </div>
        )}

        {/* Submit / Cancel */}
        <div style={styles.actions}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Add Question'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
  },
  formGroup: {
    marginBottom: '16px',
    flex: 1,
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
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
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'Arial, sans-serif',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#fff',
  },
  row: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  // MCQ styles
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  radio: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#4f46e5',
  },
  optionInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  removeBtn: {
    width: '30px',
    height: '30px',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionBtn: {
    padding: '6px 14px',
    border: '1px dashed #4f46e5',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '4px',
  },
  // True/False styles
  tfRow: {
    display: 'flex',
    gap: '12px',
  },
  tfBtn: {
    padding: '10px 28px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.15s ease',
  },
  // Actions
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
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

export default QuestionForm;