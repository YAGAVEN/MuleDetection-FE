/**
 * Auth Context Provider
 * Manages authentication state and user information
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../config/supabase';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, error } = await authService.getCurrentUser();
        if (error) {
          console.error('Auth check error:', error);
        } else {
          setUser(user);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth state changes
    const subscription = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { user: signedInUser, error: signInError } = await authService.signIn(email, password);
      if (signInError) {
        setError(signInError);
        return { success: false, error: signInError };
      }
      setUser(signedInUser);
      return { success: true, user: signedInUser };
    } catch (err) {
      const errorMsg = err.message || 'Sign in failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { user: newUser, error: signUpError } = await authService.signUp(email, password);
      if (signUpError) {
        setError(signUpError);
        return { success: false, error: signUpError };
      }
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (err) {
      const errorMsg = err.message || 'Sign up failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await authService.signOut();
      if (signOutError) {
        setError(signOutError);
        return { success: false, error: signOutError };
      }
      setUser(null);
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Sign out failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
