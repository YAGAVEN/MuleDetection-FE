/**
 * Chronos Page - Data Visualization & Pattern Analysis
 * Real-time transaction data visualization with ECharts
 */

import React, { useEffect, useState } from 'react';
import { api, API_CONFIG } from '../config/api';
import { iobTheme, getThemeByPage } from '../config/theme';
import { Calendar, Download, Filter } from 'lucide-react';
import * as echarts from 'echarts';

const ChronosPage = () => {
  const theme = getThemeByPage('chronos');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedMetric, setSelectedMetric] = useState('transaction_count');

  // Chart references
  const timeSeriesRef = React.useRef(null);
  const heatmapRef = React.useRef(null);
  const distributionRef = React.useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch analytics data
        const res = await api.get(API_CONFIG.ENDPOINTS.DB.ANALYTICS, {
          params: { timeRange, metric: selectedMetric },
        });

        setData(res.data);
        setError(null);
      } catch (err) {
        console.error('Data fetch error:', err);
        setError(err.response?.data?.message || 'Failed to load data');
        // Set mock data for demo
        setData(generateMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, selectedMetric]);

  // Render charts when data changes
  useEffect(() => {
    if (data && !loading) {
      renderCharts();
    }
  }, [data, loading]);

  const generateMockData = () => ({
    timeSeries: {
      dates: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07'],
      transactions: [450, 520, 489, 668, 590, 720, 650],
      suspiciousCount: [12, 15, 14, 22, 18, 25, 20],
      avgAmount: [12500, 13200, 12800, 14100, 13500, 14900, 13800],
    },
    patterns: {
      hourly: {
        hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        transactions: Array.from({ length: 24 }, () => Math.floor(Math.random() * 100)),
      },
      riskDistribution: {
        low: 65,
        medium: 20,
        high: 10,
        critical: 5,
      },
    },
  });

  const renderCharts = () => {
    if (!data) return;

    // Time Series Chart
    if (timeSeriesRef.current) {
      const chart = echarts.init(timeSeriesRef.current);
      chart.setOption({
        color: [theme.chart1, theme.chart2],
        tooltip: { trigger: 'axis' },
        legend: {
          data: ['Transaction Count', 'Suspicious Count'],
          textStyle: { color: theme.chart1 },
        },
        grid: { left: '3%', right: '3%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          data: data.timeSeries.dates,
          axisLine: { lineStyle: { color: '#ccc' } },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#ccc' } },
        },
        series: [
          {
            name: 'Transaction Count',
            data: data.timeSeries.transactions,
            type: 'line',
            smooth: true,
            areaStyle: { color: theme.chart1 + '30' },
          },
          {
            name: 'Suspicious Count',
            data: data.timeSeries.suspiciousCount,
            type: 'line',
            smooth: true,
            areaStyle: { color: theme.negative + '30' },
          },
        ],
      });
    }

    // Hourly Pattern Chart
    if (heatmapRef.current) {
      const chart = echarts.init(heatmapRef.current);
      chart.setOption({
        color: [theme.chart1, theme.chart2, theme.chart3, theme.chart4],
        tooltip: { trigger: 'axis' },
        legend: { textStyle: { color: theme.chart1 } },
        grid: { left: '3%', right: '3%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          data: data.patterns.hourly.hours,
          axisLine: { lineStyle: { color: '#ccc' } },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#ccc' } },
        },
        series: [
          {
            name: 'Transaction Volume',
            data: data.patterns.hourly.transactions,
            type: 'bar',
            itemStyle: { color: theme.chart1 },
          },
        ],
      });
    }

    // Risk Distribution Pie Chart
    if (distributionRef.current) {
      const chart = echarts.init(distributionRef.current);
      const riskData = data.patterns.riskDistribution;
      chart.setOption({
        tooltip: { trigger: 'item' },
        legend: {
          orient: 'vertical',
          left: 'left',
          textStyle: { color: theme.chart1 },
        },
        series: [
          {
            name: 'Risk Distribution',
            type: 'pie',
            radius: '50%',
            data: [
              { value: riskData.low, name: 'Low Risk', itemStyle: { color: theme.positive } },
              { value: riskData.medium, name: 'Medium Risk', itemStyle: { color: '#FF9800' } },
              { value: riskData.high, name: 'High Risk', itemStyle: { color: '#FF6B35' } },
              { value: riskData.critical, name: 'Critical', itemStyle: { color: theme.negative } },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      });
    }
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
          Chronos - Data Visualization
        </h1>
        <p style={{ color: iobTheme.colors.gray[600] }}>Real-time transaction patterns and analysis</p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color={theme.primary} />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: `2px solid ${theme.accent}`,
              borderRadius: '0.375rem',
              backgroundColor: iobTheme.colors.secondary.main,
              color: iobTheme.colors.gray[700],
              cursor: 'pointer',
            }}
          >
            <option value="1day">Last 24 Hours</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} color={theme.primary} />
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: `2px solid ${theme.accent}`,
              borderRadius: '0.375rem',
              backgroundColor: iobTheme.colors.secondary.main,
              color: iobTheme.colors.gray[700],
              cursor: 'pointer',
            }}
          >
            <option value="transaction_count">Transaction Count</option>
            <option value="amount_volume">Amount Volume</option>
            <option value="risk_score">Risk Score</option>
          </select>
        </div>

        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: theme.primary,
            color: iobTheme.colors.secondary.main,
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: iobTheme.colors.secondary.main,
            borderRadius: '0.75rem',
          }}
        >
          <p style={{ color: iobTheme.colors.gray[600] }}>Loading visualization data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            backgroundColor: iobTheme.colors.error + '15',
            border: `2px solid ${iobTheme.colors.error}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '2rem',
            color: iobTheme.colors.error,
          }}
        >
          {error}
        </div>
      )}

      {/* Charts Grid */}
      {!loading && data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Time Series Chart */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              gridColumn: 'span 2',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Transaction Trends
            </h3>
            <div ref={timeSeriesRef} style={{ width: '100%', height: '300px' }} />
          </div>

          {/* Hourly Pattern */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Hourly Activity Pattern
            </h3>
            <div ref={heatmapRef} style={{ width: '100%', height: '300px' }} />
          </div>

          {/* Risk Distribution */}
          <div
            style={{
              backgroundColor: iobTheme.colors.secondary.main,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: theme.primary }}>
              Risk Distribution
            </h3>
            <div ref={distributionRef} style={{ width: '100%', height: '300px' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChronosPage;
