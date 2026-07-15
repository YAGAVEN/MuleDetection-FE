import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts'

// Professional Chart Colors
const CHART_COLORS = {
  success: '#00FF87',
  danger: '#FF3B3B',
  warning: '#FFB800',
  info: '#00D4FF',
  investigation: '#9D4EDD',
  gray: '#6B7280'
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="cyber-card p-3 border border-subtle">
        <p className="text-xs text-muted mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-secondary">{entry.name}:</span>
            <span className="font-semibold text-primary data-value">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Investigation Performance Chart
export function InvestigationPerformanceChart({ data = [] }) {
  const chartData = useMemo(() => {
    return data.length ? data : [
      { month: 'Jan', resolved: 12, opened: 15, rate: 80 },
      { month: 'Feb', resolved: 19, opened: 22, rate: 86 },
      { month: 'Mar', resolved: 15, opened: 18, rate: 83 },
      { month: 'Apr', resolved: 22, opened: 25, rate: 88 },
      { month: 'May', resolved: 28, opened: 30, rate: 93 },
      { month: 'Jun', resolved: 25, opened: 28, rate: 89 }
    ]
  }, [data])

  return (
    <div className="cyber-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="cyber-heading-3">Investigation Performance</h3>
          <p className="text-xs text-muted">Monthly case resolution trends</p>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-muted">Resolved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-info"></div>
            <span className="text-muted">Opened</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="month"
            stroke="var(--color-text-tertiary)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="var(--color-text-tertiary)"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="resolved"
            stroke={CHART_COLORS.success}
            strokeWidth={2}
            fill="url(#colorResolved)"
            name="Cases Resolved"
          />
          <Area
            type="monotone"
            dataKey="opened"
            stroke={CHART_COLORS.info}
            strokeWidth={2}
            fill="url(#colorOpened)"
            name="Cases Opened"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Risk Distribution Donut Chart
export function RiskDistributionChart({ data = [] }) {
  const chartData = useMemo(() => {
    return data.length ? data : [
      { name: 'Critical', value: 8, color: CHART_COLORS.danger },
      { name: 'High', value: 15, color: '#FF6B6B' },
      { name: 'Medium', value: 23, color: CHART_COLORS.warning },
      { name: 'Low', value: 54, color: CHART_COLORS.info }
    ]
  }, [data])

  const total = useMemo(() =>
    chartData.reduce((sum, item) => sum + item.value, 0),
  [chartData])

  return (
    <div className="cyber-card p-6">
      <div className="mb-6">
        <h3 className="cyber-heading-3">Risk Distribution</h3>
        <p className="text-xs text-muted">Account risk classification breakdown</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-secondary">{item.name}</span>
            </div>
            <span className="text-sm font-semibold data-value">
              {item.value} ({((item.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Analyst Workload Radar Chart
export function AnalystWorkloadRadar({ data = [] }) {
  const chartData = useMemo(() => {
    return data.length ? data : [
      { analyst: 'Analyst A', active: 12, resolved: 8, efficiency: 92 },
      { analyst: 'Analyst B', active: 15, resolved: 11, efficiency: 88 },
      { analyst: 'Analyst C', active: 9, resolved: 7, efficiency: 95 },
      { analyst: 'Analyst D', active: 18, resolved: 13, efficiency: 85 },
      { analyst: 'Analyst E', active: 11, resolved: 9, efficiency: 90 }
    ]
  }, [data])

  return (
    <div className="cyber-card p-6">
      <div className="mb-6">
        <h3 className="cyber-heading-3">Analyst Performance</h3>
        <p className="text-xs text-muted">Individual analyst workload and efficiency</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <RadarChart cx="50%" cy="50%" outerRadius={80} data={chartData}>
          <PolarGrid stroke="var(--border-subtle)" />
          <PolarAngleAxis
            dataKey="analyst"
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 20]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
          />
          <Radar
            name="Active Cases"
            dataKey="active"
            stroke={CHART_COLORS.info}
            fill={CHART_COLORS.info}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Radar
            name="Resolved"
            dataKey="resolved"
            stroke={CHART_COLORS.success}
            fill={CHART_COLORS.success}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Legend />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Real-time Case Velocity Chart
export function CaseVelocityChart({ data = [] }) {
  const [timeRange, setTimeRange] = useState('24h')

  const chartData = useMemo(() => {
    return data.length ? data : [
      { time: '00:00', velocity: 3.2, backlog: 35 },
      { time: '04:00', velocity: 2.8, backlog: 33 },
      { time: '08:00', velocity: 4.1, backlog: 30 },
      { time: '12:00', velocity: 5.2, backlog: 26 },
      { time: '16:00', velocity: 4.8, backlog: 24 },
      { time: '20:00', velocity: 3.9, backlog: 22 }
    ]
  }, [data])

  const ranges = ['1h', '6h', '24h', '7d', '30d']

  return (
    <div className="cyber-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="cyber-heading-3">Case Velocity</h3>
          <p className="text-xs text-muted">Real-time case resolution rate</p>
        </div>
        <div className="flex gap-2">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`view-button ${timeRange === range ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="time"
            stroke="var(--color-text-tertiary)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="var(--color-text-tertiary)"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="velocity"
            stroke={CHART_COLORS.success}
            strokeWidth={3}
            dot={{ fill: CHART_COLORS.success, r: 4 }}
            activeDot={{ r: 6 }}
            name="Cases/Hour"
          />
          <Line
            type="monotone"
            dataKey="backlog"
            stroke={CHART_COLORS.warning}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.warning, r: 3 }}
            name="Backlog"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="data-label">Current Velocity</div>
          <div className="data-value text-success text-xl">3.9/hr</div>
        </div>
        <div className="text-center">
          <div className="data-label">Backlog</div>
          <div className="data-value text-warning text-xl">22 cases</div>
        </div>
        <div className="text-center">
          <div className="data-label">Trend</div>
          <div className="data-value text-info text-xl">+12%</div>
        </div>
      </div>
    </div>
  )
}

// Priority Heatmap
export function PriorityHeatmap({ data = [] }) {
  const chartData = useMemo(() => {
    return data.length ? data : [
      { priority: 'Critical', analyst1: 3, analyst2: 2, analyst3: 3, analyst4: 0 },
      { priority: 'High', analyst1: 5, analyst2: 4, analyst3: 6, analyst4: 0 },
      { priority: 'Medium', analyst1: 8, analyst2: 7, analyst3: 6, analyst4: 0 },
      { priority: 'Low', analyst1: 12, analyst2: 10, analyst3: 9, analyst4: 0 }
    ]
  }, [data])

  const getHeatColor = (value) => {
    if (value === 0) return 'var(--color-surface)'
    if (value <= 3) return CHART_COLORS.success
    if (value <= 6) return CHART_COLORS.warning
    return CHART_COLORS.danger
  }

  return (
    <div className="cyber-card p-6">
      <div className="mb-6">
        <h3 className="cyber-heading-3">Workload Distribution</h3>
        <p className="text-xs text-muted">Case priority by analyst assignment</p>
      </div>

      <div className="space-y-3">
        {chartData.map((row) => (
          <div key={row.priority} className="flex items-center">
            <div className="w-24 text-sm text-secondary font-medium">
              {row.priority}
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2">
              {Object.keys(row).filter(key => key !== 'priority').map((analyst) => (
                <div
                  key={analyst}
                  className="h-8 rounded flex items-center justify-center text-xs font-semibold data-value"
                  style={{
                    backgroundColor: getHeatColor(row[analyst]),
                    color: row[analyst] > 6 ? 'white' : 'var(--color-text-primary)'
                  }}
                >
                  {row[analyst] || '-'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-4 mt-6 text-xs">
        <span className="text-muted">Load:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS.success }} />
          <span className="text-muted">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS.warning }} />
          <span className="text-muted">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS.danger }} />
          <span className="text-muted">High</span>
        </div>
      </div>
    </div>
  )
}

// Mini Sparkline Component
export function Sparkline({ data = [], color = 'success', width = 100, height = 30 }) {
  const sparkData = useMemo(() => {
    return data.length ? data : Array.from({ length: 10 }, () => Math.random() * 100)
  }, [data])

  const sparkColor = CHART_COLORS[color] || CHART_COLORS.info

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={sparkData.map((val, i) => ({ i, value: val }))}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={sparkColor} stopOpacity={0.5}/>
            <stop offset="95%" stopColor={sparkColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={sparkColor}
          strokeWidth={2}
          fill={`url(#spark-${color})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}