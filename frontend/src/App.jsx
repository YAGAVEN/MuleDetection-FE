/**
 * Main App Component
 * Routing and Context Providers
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/common/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ChronosPage from './pages/ChronosPage';
import MuleEnginePage from './pages/MuleEnginePage';
import HydraPage from './pages/HydraPage';
import SentinelPage from './pages/SentinelPage';
import { iobTheme } from './config/theme';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: iobTheme.colors.primary.main,
          color: iobTheme.colors.secondary.main,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: `4px solid ${iobTheme.colors.secondary.main}20`,
              borderTop: `4px solid ${iobTheme.colors.secondary.main}`,
              borderRadius: '50%',
              margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

// App Content (inside AuthProvider)
const AppContent = () => {
  return (
    <Router>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "${iobTheme.typography.fontFamily.sans}";
          background-color: ${iobTheme.colors.gray[50]};
          color: ${iobTheme.colors.gray[900]};
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${iobTheme.colors.gray[100]};
        }

        ::-webkit-scrollbar-thumb {
          background: ${iobTheme.colors.primary.main};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${iobTheme.colors.primary.dark};
        }
      `}</style>

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chronos"
          element={
            <ProtectedRoute>
              <ChronosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mule-engine"
          element={
            <ProtectedRoute>
              <MuleEnginePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hydra"
          element={
            <ProtectedRoute>
              <HydraPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sentinel"
          element={
            <ProtectedRoute>
              <SentinelPage />
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
