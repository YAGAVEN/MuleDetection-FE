/**
 * Login Page Component
 * Supabase direct authentication with IOB branding
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { iobTheme } from '../config/theme';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSignUp, setIsSignUp] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await signIn(email, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleDemoLogin = async () => {
    // Demo credentials for testing
    const result = await signIn('demo@iobbank.com', 'demo@123456');
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${iobTheme.colors.primary.main} 0%, ${iobTheme.colors.primary.light} 100%)`,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: iobTheme.colors.secondary.main,
          borderRadius: '0.75rem',
          boxShadow: iobTheme.colors.gray[900] + '33',
          padding: '2rem',
          maxWidth: '24rem',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              color: iobTheme.colors.primary.main,
              marginBottom: '0.5rem',
            }}
          >
            IOB Bank
          </h1>
          <p
            style={{
              color: iobTheme.colors.gray[600],
              fontSize: '0.875rem',
            }}
          >
            Mule Account Detection & AML Compliance
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '2rem', gap: '0.5rem' }}>
          <button
            onClick={() => setIsSignUp(false)}
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              backgroundColor: !isSignUp ? iobTheme.colors.primary.main : iobTheme.colors.gray[200],
              color: !isSignUp ? iobTheme.colors.secondary.main : iobTheme.colors.gray[700],
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              backgroundColor: isSignUp ? iobTheme.colors.primary.main : iobTheme.colors.gray[200],
              color: isSignUp ? iobTheme.colors.secondary.main : iobTheme.colors.gray[700],
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {authError && (
          <div
            style={{
              backgroundColor: iobTheme.colors.error + '15',
              color: iobTheme.colors.error,
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {authError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email Field */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: iobTheme.colors.gray[700],
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `2px solid ${errors.email ? iobTheme.colors.error : iobTheme.colors.gray[300]}`,
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            {errors.email && (
              <p style={{ color: iobTheme.colors.error, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: iobTheme.colors.gray[700],
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `2px solid ${errors.password ? iobTheme.colors.error : iobTheme.colors.gray[300]}`,
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            {errors.password && (
              <p style={{ color: iobTheme.colors.error, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: iobTheme.colors.primary.main,
              color: iobTheme.colors.secondary.main,
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              marginTop: '0.5rem',
            }}
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Demo Login */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: iobTheme.colors.gray[600], fontSize: '0.75rem', marginBottom: '0.75rem' }}>
            Or try demo credentials
          </p>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            style={{
              backgroundColor: 'transparent',
              color: iobTheme.colors.primary.main,
              padding: '0.5rem 1rem',
              border: `2px solid ${iobTheme.colors.primary.main}`,
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? 'Loading...' : 'Demo Login'}
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: iobTheme.colors.gray[500],
            fontSize: '0.75rem',
            marginTop: '1.5rem',
          }}
        >
          © 2024 Indian Overseas Bank. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
