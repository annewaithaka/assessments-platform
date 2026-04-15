// client/src/components/ProtectedRoute.jsx

/*
  ProtectedRoute — prevents unauthenticated users from accessing 
  pages that require login.

  How it works:
  - Wraps around a page component in the router
  - Checks if there's a logged-in user
  - If yes → renders the page
  - If no → redirects to /login

  This is the frontend equivalent of @jwt_required() on the backend.
  But remember: frontend protection is for UX only (preventing 
  users from seeing pages they shouldn't). The REAL security is 
  on the backend — the API will reject requests without valid tokens 
  regardless of what the frontend does.
*/

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // While checking for a saved token, show nothing.
  // This prevents the login page from flashing briefly.
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
    // replace means this redirect won't appear in browser history.
    // If the user hits "back," they won't land on this redirect — 
    // they'll go to wherever they were before.
  }

  // Logged in → render the actual page
  return children;
}

export default ProtectedRoute;