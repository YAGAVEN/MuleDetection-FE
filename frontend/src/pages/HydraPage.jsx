/**
 * Hydra Page - Adversarial GAN Training
 * Real-time GAN training with WebSocket updates
 */

import React, { useEffect, useState } from 'react';
import { api, API_CONFIG } from '../config/api';
import { iobTheme, getThemeByPage } from '../config/theme';
import { Play, Pause, Download, ChevronDown } from 'lucide-react';
import * as echarts from 'echarts';
import { GANWebSocketService } from '../services/websocket';

const HydraPage = () => {
  const theme = getThemeByPage('hydra');
  const [training, setTraining] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [wsService, setWsService] = useState(null);
  const [config, setConfig] = useState({
    gan_epochs: 50,
    gan_batch_size: 32,
    gan_latent_dim: 100,
    lambda_cycle: 0.5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const progressChartRef = React.useRef(null);
  const lossChartRef = React.useRef(null);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const res = await api.get(API_CONFIG.ENDPOINTS.GAN.SESSIONS);
      setTrainings(res.data.sessions || []);

      // Connect to latest training if available
      const latestTraining = res.data.sessions?.[0];
      if (latestTraining) {
        connectToTraining(latestTraining.training_id);
      }
    } catch (err) {
      console.error('Failed to fetch trainings:', err);
      // Mock data
      setTrainings([
        {
          training_id: 'train_20240115_mock_001',
          status: 'completed',
          started_at: '2024-01-15T10:00:00Z',
        },
      ]);
    }
  };

  const connectToTraining = async (trainingId) => {
    try {
      // Fetch current training status
      const res = await api.get(`${API_CONFIG.ENDPOINTS.GAN.TRAIN_PROGRESS}/${trainingId}`);
      setTraining(res.data);
      setSelectedTraining(trainingId);

      // Connect WebSocket if training is ongoing
      if (res.data.status === 'training') {
        const ws = new GANWebSocketService(trainingId);
        ws.onProgress((data) => {
          setTraining((prev) => ({
            ...prev,
            ...data,
          }));
        });
        ws.onMetrics((data) => {
          setTraining((prev) => ({
            ...prev,
            ...data,
          }));
        });

        ws.connect({
          onOpen: () => console.log('WebSocket connected'),
          onError: (err) => console.error('WebSocket error:', err),
        }).catch((err) => console.error('WebSocket connection failed:', err));

        setWsService(ws);
      }
    } catch (err) {
      console.error('Failed to fetch training status:', err);
    }
  };

  const startTraining = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await api.post(API_CONFIG.ENDPOINTS.GAN.TRAIN_START, {
        data_path: '/path/to/data.csv',
        config,
      });

      setTraining(res.data);
      setSelectedTraining(res.data.training_id);
      connectToTraining(res.data.training_id);

      // Refresh trainings list
      fetchTrainings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start training');
    } finally {
      setLoading(false);
    }
  };

  const saveCheckpoint = async () => {
    if (!selectedTraining) return;

    try {
      await api.post(API_CONFIG.ENDPOINTS.GAN.CHECKPOINT_SAVE, {
        training_id: selectedTraining,
        checkpoint_name: `checkpoint_${new Date().toISOString().slice(0, 10)}`,
      });

      alert('Checkpoint saved successfully');
    } catch (err) {
      alert('Failed to save checkpoint');
    }
  };

  useEffect(() => {
    if (training && progressChartRef.current) {
      renderProgressChart();
    }
    if (training && lossChartRef.current) {
      renderLossChart();
    }
  }, [training]);

  const renderProgressChart = () => {
    if (!training || !progressChartRef.current) return;

    const chart = echarts.init(progressChartRef.current);
    const progress = (training.current_epoch / training.total_epochs) * 100;

    chart.setOption({
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          radius: '80%',
          center: ['50%', '60%'],
          min: 0,
          max: 100,
          progress: { show: true, width: 30, itemStyle: { color: theme.progress } },
          axisLine: { lineStyle: { width: 30, color: [[1, '#E9ECEF']] } },
          axisTick: { distance: 8, splitNumber: 5, lineStyle: { width: 2, color: '#999' } },
          splitLine: { distance: 8, length: 8, lineStyle: { width: 3, color: '#999' } },
          axisLabel: { color: 'auto', distance: 16, fontSize: 12 },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: theme.progress,
            fontSize: 20,
          },
          data: [progress],
        },
      ],
    });
  };

  const renderLossChart = () => {
    if (!training || !lossChartRef.current) return;

    const chart = echarts.init(lossChartRef.current);

    chart.setOption({
      color: [theme.primary, '#FF6B35', '#9C27B0'],
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Current Loss', 'Best Loss', 'Generator Loss'],
        textStyle: { color: theme.primary },
      },
      grid: { left: '3%', right: '3%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: Array.from({ length: Math.min(training.current_epoch || 1, 20) }, (_, i) =>
          Math.max(1, (training.current_epoch || 1) - 20 + i)
        ),
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Current Loss',
          data: Array.from({ length: 20 }, () => (training.current_loss || 0.5) + Math.random() * 0.1),
          type: 'line',
          smooth: true,
        },
        {
          name: 'Best Loss',
          data: Array.from({ length: 20 }, (_, i) =>
            Math.max(0.1, (training.best_loss || 0.3) + Math.random() * 0.05)
          ),
          type: 'line',
          smooth: true,
        },
      ],
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
          Hydra - Adversarial Training
        </h1>
        <p style={{ color: iobTheme.colors.gray[600] }}>Real-time GAN training with live progress monitoring</p>
      </div>

      {/* Status Overview */}
      {training && (
        <div
          style={{
            backgroundColor: iobTheme.colors.secondary.main,
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Status', value: training.status?.toUpperCase(), color: theme.primary },
              { label: 'Epoch', value: `${training.current_epoch}/${training.total_epochs}` },
              {
                label: 'Current Loss',
                value: training.current_loss ? training.current_loss.toFixed(4) : 'N/A',
              },
              {
                label: 'Best Loss',
                value: training.best_loss ? training.best_loss.toFixed(4) : 'N/A',
              },
            ].map((item, idx) => (
              <div key={idx}>
                <p
                  style={{
                    color: iobTheme.colors.gray[600],
                    fontSize: '0.875rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: item.color || theme.primary,
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {training && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Progress Chart */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Training Progress
            </h3>
            <div ref={progressChartRef} style={{ width: '100%', height: '250px' }} />
          </div>

          {/* Loss Chart */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Loss Trend
            </h3>
            <div ref={lossChartRef} style={{ width: '100%', height: '250px' }} />
          </div>
        </div>
      )}

      {/* Training Configuration */}
      <form
        onSubmit={startTraining}
        style={{
          backgroundColor: iobTheme.colors.secondary.main,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: theme.primary,
          }}
        >
          Training Configuration
        </h2>

        {error && (
          <div
            style={{
              backgroundColor: iobTheme.colors.error + '15',
              color: iobTheme.colors.error,
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Basic Config */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {[
            { label: 'Epochs', key: 'gan_epochs', type: 'number' },
            { label: 'Batch Size', key: 'gan_batch_size', type: 'number' },
            { label: 'Latent Dim', key: 'gan_latent_dim', type: 'number' },
            { label: 'Lambda Cycle', key: 'lambda_cycle', type: 'number', step: 0.1 },
          ].map((field) => (
            <div key={field.key}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: iobTheme.colors.gray[700],
                }}
              >
                {field.label}
              </label>
              <input
                type={field.type}
                value={config[field.key]}
                onChange={(e) =>
                  setConfig({ ...config, [field.key]: parseFloat(e.target.value) || e.target.value })
                }
                step={field.step || 1}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${iobTheme.colors.gray[300]}`,
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          ))}
        </div>

        {/* Advanced Config Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.primary,
            fontWeight: '500',
            marginBottom: '1rem',
          }}
        >
          Advanced Options
          <ChevronDown size={16} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)' }} />
        </button>

        {showAdvanced && (
          <div
            style={{
              backgroundColor: iobTheme.colors.gray[50],
              padding: '1rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {[
              { label: 'Lambda GP', key: 'lambda_gp' },
              { label: 'Synthetic Ratio', key: 'synthetic_ratio' },
              { label: 'Adversarial Epsilon', key: 'adversarial_epsilon' },
            ].map((field) => (
              <div key={field.key}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {field.label}
                </label>
                <input
                  type="number"
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${iobTheme.colors.gray[300]}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading || training?.status === 'training'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: training?.status === 'training' ? iobTheme.colors.gray[400] : theme.primary,
              color: iobTheme.colors.secondary.main,
              border: 'none',
              borderRadius: '0.375rem',
              cursor: training?.status === 'training' ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            <Play size={16} />
            {training?.status === 'training' ? 'Training in Progress' : 'Start Training'}
          </button>

          <button
            type="button"
            onClick={saveCheckpoint}
            disabled={!training}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: iobTheme.colors.secondary.main,
              color: theme.primary,
              border: `2px solid ${theme.primary}`,
              borderRadius: '0.375rem',
              cursor: training ? 'pointer' : 'not-allowed',
              fontWeight: '600',
            }}
          >
            <Download size={16} />
            Save Checkpoint
          </button>
        </div>
      </form>

      {/* Previous Trainings */}
      <div
        style={{
          backgroundColor: iobTheme.colors.secondary.main,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: theme.primary,
          }}
        >
          Training History
        </h2>

        {trainings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${iobTheme.colors.gray[200]}` }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Training ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Started</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {trainings.slice(0, 10).map((train, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${iobTheme.colors.gray[200]}` }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {train.training_id?.slice(0, 20)}...
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          backgroundColor:
                            train.status === 'completed'
                              ? theme.completed + '20'
                              : theme.training + '20',
                          color: train.status === 'completed' ? theme.completed : theme.training,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                        }}
                      >
                        {train.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {new Date(train.started_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => connectToTraining(train.training_id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: theme.primary,
                          color: iobTheme.colors.secondary.main,
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: iobTheme.colors.gray[600], textAlign: 'center', padding: '2rem' }}>
            No training history available
          </p>
        )}
      </div>
    </div>
  );
};

export default HydraPage;
