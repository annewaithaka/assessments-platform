// client/src/components/AssessmentForm.jsx

/*
  A modal form for creating and editing assessments.
  
  This component serves double duty:
  - If `assessment` prop is null → it's a CREATE form
  - If `assessment` prop has data → it's an EDIT form (pre-filled)
  
  This pattern is called "controlled components" — React state 
  controls the input values. Every keystroke updates state, and 
  state drives what's displayed. This gives you full control over 
  the form data at all times.
*/

import { useState } from 'react';

function AssessmentForm({ assessment, onSubmit, onClose }) {
  // Pre-fill with existing data if editing, empty if creating
  const [title, setTitle] = useState(assessment?.title || '');
  const [description, setDescription] = useState(assessment?.description || '');
  const [duration, setDuration] = useState(assessment?.duration_minutes || 60);
  const [price, setPrice] = useState(assessment?.price || 0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!assessment;
  // !! converts any value to a boolean. 
  // If assessment is an object → true. If null/undefined → false.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (duration <= 0) {
      setError('Duration must be greater than 0');
      return;
    }
    if (price < 0) {
      setError('Price cannot be negative');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        duration_minutes: parseInt(duration),
        price: parseFloat(price),
      });
      // onSubmit is passed from AdminDashboard — it handles 
      // the actual API call and closes the modal on success
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to save assessment'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    // Overlay — the dark background behind the modal
    <div style={styles.overlay} onClick={onClose}>
      {/* 
        stopPropagation prevents clicks inside the modal from 
        triggering the overlay's onClick (which closes the modal).
        Without this, clicking inside the form would close it.
      */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>
          {isEditing ? 'Edit Assessment' : 'Create New Assessment'}
        </h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="e.g., Python Fundamentals"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              placeholder="Brief description of this assessment..."
              rows={3}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Duration (minutes) *</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={styles.input}
                min="1"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Price (KES) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={styles.input}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
            >
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
              {loading
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Assessment'}
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
    // zIndex ensures the modal appears above everything else
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '22px',
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
  row: {
    display: 'flex',
    gap: '16px',
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

export default AssessmentForm;