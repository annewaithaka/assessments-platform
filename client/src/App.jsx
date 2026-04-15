// client/src/App.jsx

/*
  The root component — now with routing and auth.

  BrowserRouter enables client-side routing. Instead of the browser 
  requesting a new page from the server for every URL, React 
  intercepts the navigation and swaps components in/out. This is 
  what makes it a "Single Page Application" (SPA).

  Routes defines ALL the possible URLs in your app.
  Route maps a URL path to a component.
*/

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    // AuthProvider wraps EVERYTHING so any component in the tree 
    // can access auth state via useAuth()
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — anyone can access */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — logged-in users only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin routes — admin only */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Default redirect
              If someone goes to /, send them to login.
              We'll change this to a landing page later. */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch-all for unknown routes */}
          <Route
            path="*"
            element={
              <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>404 — Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
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