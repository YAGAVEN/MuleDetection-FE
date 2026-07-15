import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

// Professional Investigation Metrics
const INVESTIGATION_KPI_CONFIG = [
  {
    id: 'active-cases',
    title: 'Active Investigations',
    value_path: 'cases',
    icon: '🔍',
    priority: 'critical',
    color: 'investigation',
    description: 'Cases requiring analyst attention',
    trend_path: 'cases_trend',
    format: 'number',
    size: 'large'
  },
  {
    id: 'case-velocity',
    title: 'Case Resolution Rate',
    value_path: 'resolution_rate',
    icon: '⚡',
    priority: 'high',
    color: 'success',
    description: 'Cases resolved per hour',
    trend_path: 'velocity_trend',
    format: 'rate',
    size: 'medium'
  },
  {
    id: 'analyst-workload',
    title: 'Analyst Workload',
    value_path: 'workload',
    icon: '👥',
    priority: 'medium',
    color: 'info',
    description: 'Active cases per analyst',
    trend_path: 'workload_trend',
    format: 'ratio',
    size: 'medium'
  },
  {
    id: 'critical-priority',
    title: 'Critical Priority',
    value_path: 'critical_count',
    icon: '🚨',
    priority: 'critical',
    color: 'danger',
    description: 'Cases requiring immediate action',
    trend_path: 'critical_trend',
    format: 'number',
    size: 'small'
  },
  {
    id: 'avg-resolution-time',
    title: 'Avg Resolution Time',
    value_path: 'avg_resolution_time',
    icon: '⏱️',
    priority: 'high',
    color: 'warning',
    description: 'Hours to case resolution',
    trend_path: 'resolution_trend',
    format: 'hours',
    size: 'medium'
  },
  {
    id: 'alerts-to-cases',
    title: 'Alert-to-Case Ratio',
    value_path: 'alert_conversion',
    icon: '📊',
    priority: 'medium',
    color: 'info',
    description: 'Alerts converting to cases',
    trend_path: 'conversion_trend',
    format: 'percentage',
    size: 'small'
  }
]

// Professional color mapping for investigation focus
const investigationColors = {
  investigation: '#9D4EDD', // Purple for investigation
  success: '#00FF87',      // Green for success metrics
  danger: '#FF3B3B',       // Red for critical
  warning: '#FFB800',      // Amber for warnings
  info: '#00D4FF'         // Cyan for info
}

const sizeClasses = {
  large: 'col-span-1 md:col-span-2',
  medium: 'col-span-1',
  small: 'col-span-1'
}

const priorityGlow = {
  critical: '0 0 20px rgba(255, 59, 59, 0.3)',
  high: '0 0 15px rgba(255, 184, 0, 0.2)',
  medium: '0 0 10px rgba(0, 212, 255, 0.15)',
  low: '0 0 5px rgba(157, 78, 221, 0.1)'
}

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const startTime = Date.now()
    const endValue = parseFloat(value) || 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = endValue * easeOut

      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span
      className={isAnimating ? 'animate-scale-in' : ''}
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Current value: ${displayValue.toFixed(1)}`}
    >
      {displayValue.toFixed(1)}
    </span>
  )
}

export default function InvestigationKPICards() {
  const dashboardData = useMDEStore((s) => s.dashboardData)
  const [liveData, setLiveData] = useState({})
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  // Simulate real-time updates for investigation metrics
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setLiveData({
        'active-cases': Math.floor(Math.random() * 5) + 35, // Simulate case fluctuations
        'case-velocity': (Math.random() * 2 + 3).toFixed(1),  // Resolution rate
        'critical-priority': Math.floor(Math.random() * 3) + 8  // Critical cases
      })
      setLastUpdate(Date.now())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(updateInterval)
  }, [])

  const formatValue = (value, format) => {
    switch (format) {
      case 'percentage':
        return `${value}%`
      case 'rate':
        return `${value}/hr`
      case 'hours':
        return `${value}h`
      case 'ratio':
        return `${value}:1`
      default:
        return value
    }
  }

  const getKPIValue = (kpi) => {
    // Try to get from live data first, then from dashboard data
    const liveValue = liveData[kpi.id]
    if (liveValue !== undefined) return liveValue

    // Fallback to dashboard data
    if (dashboardData && dashboardData.investigation_metrics) {
      return dashboardData.investigation_metrics[kpi.value_path] || kpi.default_value || 0
    }

    // Default fallback values for demo
    const defaults = {
      'active-cases': 39,
      'case-velocity': 4.2,
      'analyst-workload': 12,
      'critical-priority': 8,
      'avg-resolution-time': 24,
      'alerts-to-cases': 23
    }
    return defaults[kpi.id] || 0
  }

  const getTrendData = (kpi) => {
    // Generate trend data for sparkline
    const baseValue = getKPIValue(kpi)
    return Array.from({ length: 7 }, (_, i) => {
      const variation = (Math.random() - 0.5) * baseValue * 0.2
      return Math.max(0, baseValue + variation)
    })
  }

  return (
    <div className="space-y-6">
      {/* Investigation Focus Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="live-indicator"
            role="status"
            aria-live="polite"
            aria-label="Live updates active"
          >
            <div className="live-dot"></div>
            <span className="live-text">LIVE</span>
          </div>
          <div>
            <h2 className="cyber-heading-3">Investigation Operations Center</h2>
            <p className="cyber-text-small">Real-time case management and analyst performance metrics</p>
          </div>
        </div>
        <div className="text-right">
          <div className="data-label">Last Updated</div>
          <div className="cyber-text-mono text-xs">
            {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Investigation KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INVESTIGATION_KPI_CONFIG.map((kpi, index) => {
          const value = getKPIValue(kpi)
          const trendData = getTrendData(kpi)
          const color = investigationColors[kpi.color]
          const glow = priorityGlow[kpi.priority]

          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={sizeClasses[kpi.size]}
            >
              <GlassCard
                className={`p-5 h-full cyber-card-hover border-l-2 ${kpi.priority === 'critical' ? 'border-l-red-500' : 'border-l-purple-500'}`}
                style={{
                  boxShadow: kpi.priority === 'critical' ? glow : undefined
                }}
                focusable={true}
                aria-label={`${kpi.title} KPI card showing ${formatValue(value, kpi.format)} - ${kpi.description}`}
              >
                {/* KPI Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{
                        background: `rgba(${hexToRgb(color)}, 0.1)`,
                        border: `1px solid rgba(${hexToRgb(color)}, 0.3)`
                      }}
                    >
                      {kpi.icon}
                    </div>
                    <div>
                      <p className="data-label text-xs">{kpi.title}</p>
                      <p className="text-xs text-muted">{kpi.description}</p>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <div
                    className={`cyber-badge cyber-badge-${kpi.priority === 'critical' ? 'danger' : kpi.priority === 'high' ? 'warning' : 'info'}`}
                    role="status"
                    aria-label={`Priority: ${kpi.priority}`}
                  >
                    {kpi.priority.toUpperCase()}
                  </div>
                </div>

                {/* Main Value Display */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold data-value" style={{ color }}>
                      <AnimatedCounter value={value} />
                    </p>
                    <p className="text-sm text-muted">{kpi.format === 'percentage' ? '%' : kpi.format === 'rate' ? '/hr' : ''}</p>
                  </div>
                </div>

                {/* Trend Sparkline */}
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData.map((val, i) => ({ i, value: val }))}>
                      <defs>
                        <linearGradient id={`grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#grad-${kpi.id})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Footer Metrics */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-subtle">
                  <div className="text-xs">
                    <span className="text-muted">Trend: </span>
                    <span className="data-value text-success">
                      {trendData[trendData.length - 1] > trendData[0] ? '+' : ''}
                      {((trendData[trendData.length - 1] - trendData[0]) / trendData[0] * 100).toFixed(1)}%
                    </span>
                  </div>
                  {kpi.priority === 'critical' && (
                    <div className="flex items-center gap-1 text-xs text-danger">
                      <span className="live-dot"></span>
                      <span>MONITORING</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Investigation Summary Panel */}
      <GlassCard className="p-4 border-l-4 border-l-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl">🎯</div>
            <div>
              <h3 className="font-semibold text-primary">Investigation Performance Summary</h3>
              <p className="text-sm text-secondary">All critical cases are being actively monitored. Analyst capacity at 78%.</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="data-label">Resolution Rate</div>
              <div className="data-value text-success">94.2%</div>
            </div>
            <div className="text-center">
              <div className="data-label">Avg Time</div>
              <div className="data-value text-warning">18.5h</div>
            </div>
            <div className="text-center">
              <div className="data-label">Capacity</div>
              <div className="data-value text-info">78%</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ?
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
    '255, 255, 255'
}