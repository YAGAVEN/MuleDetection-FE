/**
 * Dashboard Home Page
 * Overview of system status and key metrics
 */

import React, { useEffect, useState } from 'react';
import { api, API_CONFIG } from '../config/api';
import { iobTheme, getThemeByPage } from '../config/theme';
import { AlertCircle, CheckCircle, Activity } from 'lucide-react';

const DashboardPage = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [ganHealth, setGanHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);

        // Fetch main system health
        const healthRes = await api.get(API_CONFIG.ENDPOINTS.HEALTH);
        setSystemHealth(healthRes.data);

        // Fetch GAN health
        const ganRes = await api.get(API_CONFIG.ENDPOINTS.GAN.HEALTH);
        setGanHealth(ganRes.data);
      } catch (err) {
        console.error('Health check error:', err);
        setError(err.response?.data?.message || 'Failed to load system status');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Activity size={32} style={{ color: iobTheme.colors.primary.main }} />
        <p style={{ marginTop: '1rem', color: iobTheme.colors.gray[600] }}>Loading system status...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: iobTheme.colors.primary.main,
            marginBottom: '0.5rem',
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: iobTheme.colors.gray[600] }}>System overview and key metrics</p>
      </div>

      {/* Status Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* System Health Card */}
        {systemHealth && (
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: iobTheme.colors.gray[200] + ' 0px 1px 3px',
              borderLeft: `4px solid ${iobTheme.colors.success}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: iobTheme.colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  System Status
                </p>
                <p
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: iobTheme.colors.primary.main,
                  }}
                >
                  Operational
                </p>
              </div>
              <CheckCircle size={32} color={iobTheme.colors.success} />
            </div>
          </div>
        )}

        {/* GAN Health Card */}
        {ganHealth && (
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: iobTheme.colors.gray[200] + ' 0px 1px 3px',
              borderLeft: `4px solid ${ganHealth.gan_available ? iobTheme.colors.success : iobTheme.colors.error}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: iobTheme.colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  GAN Service
                </p>
                <p
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: ganHealth.gan_available ? iobTheme.colors.success : iobTheme.colors.error,
                  }}
                >
                  {ganHealth.gan_available ? 'Ready' : 'Down'}
                </p>
                <p style={{ fontSize: '0.75rem', color: iobTheme.colors.gray[500], marginTop: '0.25rem' }}>
                  Device: {ganHealth.device}
                </p>
              </div>
              {ganHealth.training_in_progress && (
                <Activity size={32} color={iobTheme.colors.warning} style={{ animation: 'spin 2s linear infinite' }} />
              )}
            </div>
          </div>
        )}

        {/* Training Status Card */}
        {ganHealth && (
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: iobTheme.colors.gray[200] + ' 0px 1px 3px',
              borderLeft: `4px solid ${ganHealth.training_in_progress ? iobTheme.colors.warning : iobTheme.colors.info}`,
            }}
          >
            <div>
              <p style={{ color: iobTheme.colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Training Status
              </p>
              <p
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: ganHealth.training_in_progress
                    ? iobTheme.colors.warning
                    : iobTheme.colors.primary.main,
                }}
              >
                {ganHealth.training_in_progress ? 'In Progress' : 'Idle'}
              </p>
              {ganHealth.training_in_progress && (
                <p style={{ fontSize: '0.75rem', color: iobTheme.colors.gray[500], marginTop: '0.25rem' }}>
                  ID: {ganHealth.current_training_id?.slice(0, 12)}...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Features Overview */}
      <div
        style={{
          backgroundColor: iobTheme.colors.secondary.main,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: iobTheme.colors.gray[200] + ' 0px 1px 3px',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: iobTheme.colors.primary.main,
            marginBottom: '1rem',
          }}
        >
          Available Features
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
          }}
        >
          {[
            {
              icon: '📈',
              name: 'Chronos',
              description: 'Real-time data visualization and pattern analysis',
              path: '/chronos',
            },
            {
              icon: '🔍',
              name: 'Mule Engine',
              description: 'Multi-model predictions (LightGBM, GNN, Ensemble)',
              path: '/mule-engine',
            },
            {
              icon: '⚡',
              name: 'Hydra',
              description: 'Adversarial training with GAN and live reports',
              path: '/hydra',
            },
            {
              icon: '🛡️',
              name: 'Sentinel',
              description: 'Active monitoring of Alerts, SAR Reports, and DB Sync',
              path: '/sentinel',
            },
          ].map((feature, idx) => (
            <button
              key={idx}
              onClick={() => (window.location.href = feature.path)}
              style={{
                backgroundColor: iobTheme.colors.gray[50],
                border: `2px solid ${iobTheme.colors.gray[200]}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 200ms ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = iobTheme.colors.primary.main;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${iobTheme.colors.primary.main}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = iobTheme.colors.gray[200];
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{feature.icon}</div>
              <h3 style={{ fontWeight: 'bold', color: iobTheme.colors.primary.main, marginBottom: '0.25rem' }}>
                {feature.name}
              </h3>
              <p style={{ fontSize: '0.875rem', color: iobTheme.colors.gray[600] }}>{feature.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginTop: '2rem',
            backgroundColor: iobTheme.colors.error + '15',
            border: `2px solid ${iobTheme.colors.error}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={20} color={iobTheme.colors.error} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 'bold', color: iobTheme.colors.error }}>System Alert</p>
            <p style={{ fontSize: '0.875rem', color: iobTheme.colors.error, marginTop: '0.25rem' }}>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
