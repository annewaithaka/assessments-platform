// client/src/pages/AssessmentManager.jsx

/*
  Placeholder — we'll build the full question management UI 
  in Phase 3, Task 3. For now, just confirm the route works 
  and we can read the assessment ID from the URL.
*/

import { useParams, useNavigate } from 'react-router-dom';

function AssessmentManager() {
  const { id } = useParams();
  // useParams() extracts URL parameters. For the route 
  // /admin/assessments/:id, it gives us { id: "1" }
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <button
        onClick={() => navigate('/admin/dashboard')}
        style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff' }}
      >
        ← Back to Dashboard
      </button>
      <h1>Assessment Manager</h1>
      <p>Managing assessment ID: {id}</p>
      <p>Question builder will be built in the next task.</p>
    </div>
  );
}

export default AssessmentManager;