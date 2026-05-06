/**
 * Backend-based Authentication Service
 * Uses FastAPI backend auth endpoints instead of Supabase
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Store token in localStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * Auth Service using Backend API
 */
export const authService = {
  /**
   * Sign up new user
   */
  signUp: async (email, password, name = '') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/signup`, {
        email,
        password,
        name,
      });

      if (response.data.success) {
        // Store token and user
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        
        // Set auth header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        return { user: response.data.user, error: null };
      }
      return { user: null, error: response.data.message };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Signup failed';
      return { user: null, error: errorMsg };
    }
  },

  /**
   * Sign in existing user
   */
  signIn: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email,
        password,
      });

      if (response.data.success) {
        // Store token and user
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        
        // Set auth header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        return { user: response.data.user, session: { token: response.data.token }, error: null };
      }
      return { user: null, session: null, error: response.data.message };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Invalid credentials';
      return { user: null, session: null, error: errorMsg };
    }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    try {
      // Clear stored data
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      
      // Remove auth header
      delete axios.defaults.headers.common['Authorization'];
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (!userStr || !token) {
        return { user: null, error: null };
      }
      
      // Verify token is still valid with backend
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/verify-token`,
          {},
          {
            params: { token }
          }
        );
        
        if (response.data.success) {
          const user = JSON.parse(userStr);
          return { user, error: null };
        }
      } catch (err) {
        // Token is invalid, clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        delete axios.defaults.headers.common['Authorization'];
        return { user: null, error: null };
      }
      
      return { user: JSON.parse(userStr), error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  /**
   * Get current session
   */
  getCurrentSession: async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        return { session: null, error: null };
      }
      return { session: { token }, error: null };
    } catch (error) {
      return { session: null, error: error.message };
    }
  },

  /**
   * Password reset (placeholder - implement on backend if needed)
   */
  resetPassword: async (email) => {
    try {
      // This would need a backend endpoint implementation
      return { error: 'Password reset not implemented yet' };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange: (callback) => {
    // Monitor localStorage changes
    const handleStorageChange = () => {
      const userStr = localStorage.getItem(USER_KEY);
      const user = userStr ? JSON.parse(userStr) : null;
      callback(null, { user });
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Return unsubscribe function
    return {
      unsubscribe: () => {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  },
};

/**
 * Initialize auth on app load
 */
export const initializeAuth = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export default authService;
