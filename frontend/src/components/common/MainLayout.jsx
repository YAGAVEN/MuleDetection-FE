/**
 * Main Layout Component
 * Contains Navbar, Sidebar, and main content area
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { iobTheme } from '../../config/theme';
import { Menu, X, LogOut } from 'lucide-react';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { id: 'chronos', label: 'Chronos (Visualization)', path: '/chronos', icon: '📈' },
    { id: 'mule-engine', label: 'Mule Engine (Prediction)', path: '/mule-engine', icon: '🔍' },
    { id: 'hydra', label: 'Hydra (GAN Training)', path: '/hydra', icon: '⚡' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: iobTheme.colors.gray[50],
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? '250px' : '0',
          backgroundColor: iobTheme.colors.primary.main,
          transition: 'width 200ms ease-in-out',
          overflow: 'hidden',
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ padding: '1.5rem 1rem' }}>
          <h2
            style={{
              color: iobTheme.colors.secondary.main,
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginBottom: '2rem',
            }}
          >
            IOB AML
          </h2>

          {/* Menu Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: isActive(item.path) ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: iobTheme.colors.secondary.main,
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isActive(item.path) ? '600' : '500',
                  transition: 'background-color 150ms ease-in-out',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Logout Button */}
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              color: iobTheme.colors.secondary.main,
              border: `2px solid ${iobTheme.colors.error}`,
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 150ms ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Navbar */}
        <div
          style={{
            backgroundColor: iobTheme.colors.secondary.main,
            borderBottom: `1px solid ${iobTheme.colors.gray[200]}`,
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: iobTheme.colors.primary.main,
            }}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  color: iobTheme.colors.gray[900],
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                {user?.email}
              </p>
              <p
                style={{
                  color: iobTheme.colors.gray[500],
                  fontSize: '0.75rem',
                }}
              >
                Connected
              </p>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: iobTheme.colors.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iobTheme.colors.secondary.main,
                fontWeight: 'bold',
              }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
