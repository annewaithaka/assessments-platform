// client/src/context/AuthContext.jsx

/*
  AuthContext — the brain of your authentication system.

  This component does three things:
  1. Stores the current user and tokens in state
  2. Provides login/logout/register functions to any component that needs them
  3. On page load, checks if there's a saved token and restores the session

  Why Context instead of just passing props?
  Imagine your component tree:
    App → Layout → Navbar → UserMenu → LogoutButton
  
  Without Context, you'd pass user data through EVERY level, even 
  components that don't use it (Layout, Navbar). This is called 
  "prop drilling" and it gets messy fast.

  With Context, LogoutButton just says "give me the auth context" 
  and gets the user data directly. Clean.
*/

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Create the context object
const AuthContext = createContext(null);

// Custom hook — a shortcut so components don't have to import 
// both useContext and AuthContext every time
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // loading starts as true because on page load, we need to check 
  // if there's a saved token before rendering anything. Without this, 
  // you'd see the login page flash briefly before redirecting to 
  // the dashboard. Bad user experience.

  // On mount, check for an existing token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        // Set the token in axios headers so all future requests include it
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          // Verify the token is still valid by calling /me
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (err) {
          // Token is expired or invalid — clean up
          console.error('Token validation failed:', err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    /*
      Why return the response instead of handling everything here?
      Because the Login page might want to show specific error 
      messages or redirect to different places based on the user's 
      role. The context handles TOKEN STORAGE, the page handles UX.
    */
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, user: userData } = response.data;

    // Store tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    // Set token in axios headers for future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    // Update state — this triggers a re-render across the app
    setUser(userData);

    return userData;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
    // Note: we don't auto-login after registration. The user will 
    // be redirected to the login page. This is a design choice — 
    // some apps auto-login, some don't. We're keeping it simple.
  };

  const logout = () => {
    // Clear everything
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    // No API call needed — JWTs are stateless. The server doesn't 
    // track sessions, so there's nothing to invalidate server-side.
    // The token just stops being sent with requests.
  };

  // The value prop is what every component gets access to
  // when they call useAuth()
  const value = {
    user,       // Current user object (or null)
    loading,    // True while checking for saved token
    login,      // Function to log in
    register,   // Function to register
    logout,     // Function to log out
    isAdmin: user?.role === 'admin',  // Convenient boolean
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};