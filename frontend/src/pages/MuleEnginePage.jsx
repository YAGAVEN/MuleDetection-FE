/**
 * Mule Engine Page - ML Model Predictions
 * LightGBM, GNN, and Ensemble model predictions
 */

import React, { useEffect, useState } from 'react';
import { api, API_CONFIG } from '../config/api';
import { iobTheme, getThemeByPage } from '../config/theme';
import { AlertCircle, CheckCircle, Upload, TrendingUp } from 'lucide-react';

const MuleEnginePage = () => {
  const theme = getThemeByPage('mule-engine');
  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [file, setFile] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const models = [
    {
      id: 'lightgbm',
      name: 'LightGBM',
      description: 'Gradient Boosting Machine - Fast and efficient',
      color: theme.model1,
    },
    {
      id: 'gnn',
      name: 'Graph Neural Network',
      description: 'Network relationship detection',
      color: theme.model2,
    },
    {
      id: 'ensemble',
      name: 'Ensemble (All Models)',
      description: 'Combined prediction from all models',
      color: theme.model3,
    },
  ];

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setPredictions(null);

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('model', selectedModel);

      const res = await api.post(API_CONFIG.ENDPOINTS.ML.PREDICT_BATCH, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPredictions(res.data);
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.response?.data?.message || 'Prediction failed');
      // Mock data for demo
      setPredictions(generateMockPredictions());
    } finally {
      setLoading(false);
    }
  };

  const generateMockPredictions = () => ({
    summary: {
      totalRecords: 1000,
      flaggedAsRisky: 45,
      riskPercentage: 4.5,
      processingTime: 2.34,
    },
    riskDistribution: {
      low: 955,
      medium: 30,
      high: 12,
      critical: 3,
    },
    topRisks: [
      {
        accountId: 'ACC_001234',
        riskScore: 0.92,
        riskLevel: 'Critical',
        reason: 'Multiple high-value transfers to new accounts',
      },
      {
        accountId: 'ACC_005678',
        riskScore: 0.87,
        riskLevel: 'High',
        reason: 'Unusual geographic transfer patterns',
      },
      {
        accountId: 'ACC_009012',
        riskScore: 0.76,
        riskLevel: 'High',
        reason: 'Structuring pattern detected',
      },
    ],
    modelAccuracy: {
      lightgbm: 0.94,
      gnn: 0.91,
      ensemble: 0.96,
    },
  });

  const getRiskColor = (level) => {
    switch (level) {
      case 'Critical':
        return iobTheme.colors.error;
      case 'High':
        return theme.risky;
      case 'Medium':
        return theme.suspicious;
      case 'Low':
        return theme.safe;
      default:
        return iobTheme.colors.gray[500];
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: theme.primary,
            marginBottom: '0.5rem',
          }}
        >
          Mule Engine - Predictions
        </h1>
        <p style={{ color: iobTheme.colors.gray[600] }}>Multi-model ML predictions for account risk assessment</p>
      </div>

      {/* Model Selection */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => {
              setSelectedModel(model.id);
              setPredictions(null);
            }}
            style={{
              backgroundColor: selectedModel === model.id ? model.color : iobTheme.colors.gray[100],
              color: selectedModel === model.id ? iobTheme.colors.secondary.main : iobTheme.colors.gray[700],
              padding: '1rem',
              border: `2px solid ${model.color}`,
              borderRadius: '0.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 200ms ease-in-out',
            }}
            onMouseEnter={(e) => {
              if (selectedModel !== model.id) {
                e.currentTarget.style.backgroundColor = model.color + '20';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedModel !== model.id) {
                e.currentTarget.style.backgroundColor = iobTheme.colors.gray[100];
              }
            }}
          >
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{model.name}</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>{model.description}</p>
          </button>
        ))}
      </div>

      {/* File Upload */}
      <div
        style={{
          backgroundColor: iobTheme.colors.secondary.main,
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          border: `2px dashed ${theme.primary}`,
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
          }}
        >
          <Upload size={32} color={theme.primary} />
          <div>
            <p
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: theme.primary,
                marginBottom: '0.25rem',
              }}
            >
              Upload CSV File
            </p>
            <p style={{ fontSize: '0.875rem', color: iobTheme.colors.gray[600] }}>
              Drag and drop or click to select (Supported: CSV, JSON)
            </p>
          </div>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </label>

        {file && (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: iobTheme.colors.gray[600] }}>
            Selected: {file.name}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: iobTheme.colors.error + '15',
            border: `2px solid ${iobTheme.colors.error}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={20} color={iobTheme.colors.error} style={{ flexShrink: 0 }} />
          <p style={{ color: iobTheme.colors.error, fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            backgroundColor: iobTheme.colors.secondary.main,
            borderRadius: '0.75rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ color: iobTheme.colors.gray[600] }}>Running predictions...</p>
        </div>
      )}

      {/* Results */}
      {predictions && !loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Summary Cards */}
          {Object.entries({
            'Total Records': predictions.summary.totalRecords,
            'Flagged as Risky': predictions.summary.flaggedAsRisky,
            'Risk Percentage': `${predictions.summary.riskPercentage.toFixed(1)}%`,
            'Processing Time': `${predictions.summary.processingTime}s`,
          }).map(([label, value]) => (
            <div
              key={label}
              style={{
                backgroundColor: iobTheme.colors.secondary.main,
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <p
                style={{
                  color: iobTheme.colors.gray[600],
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: theme.primary,
                }}
              >
                {value}
              </p>
            </div>
          ))}

          {/* Risk Distribution */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Risk Distribution
            </h3>
            {Object.entries(predictions.riskDistribution).map(([level, count]) => (
              <div key={level} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: '500', color: iobTheme.colors.gray[700] }}>
                    {level}
                  </span>
                  <span style={{ fontWeight: '600', color: theme.primary }}>{count}</span>
                </div>
                <div
                  style={{
                    height: '8px',
                    backgroundColor: iobTheme.colors.gray[200],
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / predictions.summary.totalRecords) * 100}%`,
                      backgroundColor: getRiskColor(
                        level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')
                      ),
                      transition: 'width 300ms ease-in-out',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Model Accuracy */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Model Accuracy
            </h3>
            {Object.entries(predictions.modelAccuracy).map(([model, accuracy]) => (
              <div key={model} style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{model}</span>
                  <span style={{ fontWeight: '600', color: theme.primary }}>
                    {(accuracy * 100).toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    backgroundColor: iobTheme.colors.gray[200],
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${accuracy * 100}%`,
                      backgroundColor: accuracy > 0.95 ? theme.safe : accuracy > 0.90 ? '#FF9800' : theme.risky,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Top Risks Table */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              gridColumn: 'span 3',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Top Risk Accounts
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${iobTheme.colors.gray[200]}` }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Account ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Risk Score</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Risk Level</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.topRisks.map((risk, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${iobTheme.colors.gray[200]}` }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {risk.accountId}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                        {(risk.riskScore * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            backgroundColor: getRiskColor(risk.riskLevel) + '20',
                            color: getRiskColor(risk.riskLevel),
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                          }}
                        >
                          {risk.riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{risk.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MuleEnginePage;
