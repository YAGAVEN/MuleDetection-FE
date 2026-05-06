/**
 * Sentinel Page - Database Alerts & SAR Reports
 * Monitoring dashboard for DB endpoints
 */

import React, { useEffect, useState } from 'react';
import { api, API_CONFIG } from '../config/api';
import { iobTheme, getThemeByPage } from '../config/theme';
import { Shield, AlertTriangle, FileText, Database, Activity } from 'lucide-react';

const SentinelPage = () => {
  const theme = getThemeByPage('dashboard'); // Reuse dashboard theme for Sentinel
  
  const [syncStatus, setSyncStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [syncRes, alertsRes, reportsRes] = await Promise.all([
          api.get(API_CONFIG.ENDPOINTS.DB.SYNC_STATUS).catch(() => ({ data: null })),
          api.get(API_CONFIG.ENDPOINTS.DB.ALERTS).catch(() => ({ data: [] })),
          api.get(API_CONFIG.ENDPOINTS.DB.SAR_REPORTS).catch(() => ({ data: [] }))
        ]);

        setSyncStatus(syncRes.data);
        setAlerts(alertsRes.data || []);
        setReports(reportsRes.data || []);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load Sentinel data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return iobTheme.colors.error;
      case 'high': return '#FF6B35';
      case 'medium': return '#FF9800';
      case 'low': return iobTheme.colors.success;
      default: return iobTheme.colors.gray[500];
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return iobTheme.colors.error;
      case 'investigating': return '#FF9800';
      case 'closed': return iobTheme.colors.success;
      default: return iobTheme.colors.gray[500];
    }
  };

  if (loading && !syncStatus) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Activity size={32} style={{ color: iobTheme.colors.primary.main, animation: 'spin 2s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: iobTheme.colors.gray[600] }}>Loading Sentinel data...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: iobTheme.colors.primary.main, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={32} /> Sentinel Dashboard
        </h1>
        <p style={{ color: iobTheme.colors.gray[600] }}>Active monitoring of Alerts, SAR Reports, and DB Sync Status</p>
      </div>

      {error && (
        <div style={{ backgroundColor: iobTheme.colors.error + '15', border: `2px solid ${iobTheme.colors.error}`, borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem', color: iobTheme.colors.error }}>
          {error}
        </div>
      )}

      {/* Sync Status Card */}
      {syncStatus && (
        <div style={{ backgroundColor: iobTheme.colors.secondary.main, borderRadius: '0.75rem', padding: '1.5rem', boxShadow: iobTheme.colors.gray[200] + ' 0px 1px 3px', marginBottom: '2rem', borderLeft: `4px solid ${iobTheme.colors.info}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: iobTheme.colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>Database Synchronization Status</p>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: iobTheme.colors.primary.main }}>{syncStatus.table_counts?.accounts || 0}</p>
                  <p style={{ fontSize: '0.75rem', color: iobTheme.colors.gray[500] }}>Total Accounts</p>
                </div>
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: iobTheme.colors.primary.main }}>{syncStatus.table_counts?.alerts || alerts.length}</p>
                  <p style={{ fontSize: '0.75rem', color: iobTheme.colors.gray[500] }}>Total Alerts</p>
                </div>
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: iobTheme.colors.primary.main }}>{syncStatus.status || 'Connected'}</p>
                  <p style={{ fontSize: '0.75rem', color: iobTheme.colors.gray[500] }}>Status</p>
                </div>
              </div>
            </div>
            <Database size={32} color={iobTheme.colors.info} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Alerts */}
        <div style={{ backgroundColor: iobTheme.colors.secondary.main, borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: iobTheme.colors.primary.main, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> Recent Alerts
          </h3>
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} style={{ padding: '1rem', border: `1px solid ${iobTheme.colors.gray[200]}`, borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: iobTheme.colors.gray[800] }}>Account: {alert.account_id}</span>
                    <span style={{ backgroundColor: getSeverityColor(alert.severity) + '20', color: getSeverityColor(alert.severity), padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {alert.severity?.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: iobTheme.colors.gray[600] }}>{alert.description || alert.reason || 'Suspicious activity detected.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: iobTheme.colors.gray[500], fontSize: '0.875rem' }}>No recent alerts found.</p>
          )}
        </div>

        {/* SAR Reports */}
        <div style={{ backgroundColor: iobTheme.colors.secondary.main, borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: iobTheme.colors.primary.main, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} /> SAR Reports
          </h3>
          {reports.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${iobTheme.colors.gray[200]}` }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Report ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Account</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.slice(0, 5).map((report, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${iobTheme.colors.gray[100]}` }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{report.id || `SAR-${idx+1}`}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{report.account_id}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: getStatusColor(report.status), fontSize: '0.875rem', fontWeight: '600' }}>
                          {report.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: iobTheme.colors.gray[500], fontSize: '0.875rem' }}>No SAR reports found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SentinelPage;
