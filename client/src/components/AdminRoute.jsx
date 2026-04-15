// client/src/components/AdminRoute.jsx

/*
  AdminRoute — like ProtectedRoute but also checks for admin role.
  
  If a regular user somehow navigates to /admin/dashboard, they'll 
  be redirected to their own dashboard instead.
*/

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin → send to user dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;