import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../features/mde/components/GlassCard'

// Drill-down states
const DRILL_STATES = {
  OVERVIEW: 'overview',
  INVESTIGATION_DETAILS: 'investigation_details',
  CASE_BREAKDOWN: 'case_breakdown',
  ACCOUNT_ANALYSIS: 'account_analysis',
  ALERT_HISTORY: 'alert_history'
}

// Interactive Drill-Down Component
export function DrillDownKPI({ title, value, description, onDrillDown, children }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="cursor-pointer"
      onClick={onDrillDown}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <GlassCard
        variant={isHovered ? 'elevated' : 'default'}
        className={`p-5 h-full border-l-4 ${isHovered ? 'border-l-purple-500 glow-investigation' : 'border-l-purple-500/30'}`}
        interactive={true}
        focusable={true}
        aria-label={`View details for ${title}: ${value} - ${description}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="data-label text-xs">{title}</p>
            <p className="text-lg font-semibold data-value mt-1">{value}</p>
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: isHovered ? 1 : 0.8, rotate: isHovered ? 0 : -180 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-2xl"
            aria-hidden="true"
          >
            🔍
          </motion.div>
        </div>
        <p className="text-xs text-muted">{description}</p>
        {children}

        {/* Visual feedback for interactivity */}
        <motion.div
          className="absolute bottom-2 right-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-xs text-info">Click to explore →</span>
        </motion.div>
      </GlassCard>
    </motion.div>
  )
}

// Investigation Detail Modal
export function InvestigationDetailModal({ isOpen, onClose, caseData }) {
  // Handle escape key for closing
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-detail-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full"
          >
            <GlassCard variant="elevated" className="p-8" focusable={true}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 id="case-detail-title" className="cyber-heading-2">{caseData?.caseId || 'MDE-24042'}</h2>
                  <p className="text-muted">Investigation Case Details</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted hover:text-danger text-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-info"
                  aria-label="Close details dialog"
                >
                  ✕
                </button>
              </div>

              <CaseDetailContent caseData={caseData} />
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Case Detail Content
function CaseDetailContent({ caseData }) {
  const data = caseData || {
    caseId: 'MDE-24042',
    accountId: 'MLACC00123',
    riskScore: 87.5,
    priority: 'High',
    status: 'Under Investigation',
    pattern: 'Structuring with Layering',
    openedDate: '2026-07-10T14:30:00Z',
    assignedTo: 'Senior Analyst A',
    alerts: 12,
    transactions: 156,
    timeline: [
      { event: 'Case Created', time: '2026-07-10 14:30', user: 'System' },
      { event: 'Assigned to Analyst', time: '2026-07-10 14:35', user: 'Auto-assignment' },
      { event: 'Initial Review', time: '2026-07-10 15:00', user: 'Analyst A' },
      { event: 'Evidence Collection', time: '2026-07-11 09:00', user: 'Analyst A' },
      { event: 'Status Update', time: '2026-07-12 11:00', user: 'Analyst A' }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Risk Score" value={data.riskScore} color="danger" />
        <MetricCard label="Priority" value={data.priority} color="warning" />
        <MetricCard label="Status" value={data.status} color="info" />
        <MetricCard label="Alerts" value={data.alerts} color="success" />
      </div>

      {/* Case Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Case Information</h3>
          <div className="space-y-2 text-sm">
            <InfoRow label="Account ID" value={data.accountId} />
            <InfoRow label="Pattern" value={data.pattern} />
            <InfoRow label="Opened" value={new Date(data.openedDate).toLocaleDateString()} />
            <InfoRow label="Assigned To" value={data.assignedTo} />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Transaction Analysis</h3>
          <div className="space-y-2 text-sm">
            <InfoRow label="Total Transactions" value={data.transactions} />
            <InfoRow label="Suspicious Transactions" value="23" />
            <InfoRow label="Amount Range" value="$1,000 - $49,500" />
            <InfoRow label="Time Span" value="7 days" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="font-semibold mb-3">Case Timeline</h3>
        <div className="space-y-3">
          {data.timeline.map((event, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-success mt-1"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">{event.event}</span>
                  <span className="text-xs text-muted">{event.time}</span>
                </div>
                <p className="text-xs text-muted">by {event.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-subtle">
        <button className="cyber-btn cyber-btn-investigation">
          View Full Analysis
        </button>
        <button className="cyber-btn cyber-btn-ghost">
          Export Report
        </button>
        <button className="cyber-btn cyber-btn-ghost">
          Assign to Analyst
        </button>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ label, value, color }) {
  const colorClasses = {
    danger: 'text-danger bg-danger/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-info bg-info/10',
    success: 'text-success bg-success/10'
  }

  return (
    <div className="cyber-card p-4 text-center">
      <p className="data-label text-xs">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClasses[color]?.split(' ')[0]}`}>
        {value}
      </p>
    </div>
  )
}

// Info Row Component
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}:</span>
      <span className="font-medium data-value">{value}</span>
    </div>
  )
}

// Drill-down breadcrumb system
export function DrillDownBreadcrumb({ crumbs, onNavigate }) {
  return (
    <div className="flex items-center gap-2 text-sm mb-4">
      {crumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-muted">/</span>}
          <button
            onClick={() => onNavigate(index)}
            className={`hover:text-success transition-colors ${
              index === crumbs.length - 1 ? 'font-semibold text-success' : 'text-muted'
            }`}
          >
            {crumb}
          </button>
        </div>
      ))}
    </div>
  )
}

// Interactive Data Table with Drill-down
export function DrillDownTable({ data, onRowClick }) {
  const [sortField, setSortField] = useState('riskScore')
  const [sortDirection, setSortDirection] = useState('desc')
  const [focusedRow, setFocusedRow] = useState(null)

  const sortedData = [...data].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1
    return (a[sortField] > b[sortField] ? 1 : -1) * multiplier
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e, index, row) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        onRowClick(row)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedRow(Math.max(0, index - 1))
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedRow(Math.min(sortedData.length - 1, index + 1))
        break
      default:
        break
    }
  }

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-danger'
    if (score >= 60) return 'text-warning'
    if (score >= 40) return 'text-info'
    return 'text-success'
  }

  return (
    <div className="cyber-card p-6">
      <table className="w-full" role="grid" aria-label="Investigation cases table">
        <thead>
          <tr className="border-b border-subtle">
            {['Case ID', 'Account', 'Risk Score', 'Priority', 'Status', 'Actions'].map((column) => {
              const fieldKey = column.toLowerCase().replace(' ', '')
              return (
                <th
                  key={column}
                  className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort(fieldKey)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort(fieldKey)
                    }
                  }}
                  aria-sort={
                    sortField === fieldKey
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  scope="col"
                >
                  {column}
                  {sortField === fieldKey && (
                    <span className="ml-1" aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr
              key={index}
              className={`border-b border-subtle hover:bg-white/5 cursor-pointer transition-colors ${
                focusedRow === index ? 'bg-white/10' : ''
              }`}
              onClick={() => onRowClick(row)}
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, index, row)}
              onFocus={() => setFocusedRow(index)}
              onBlur={() => setFocusedRow(null)}
              aria-label={`Case ${row.caseId}, Risk score ${row.riskScore}, Priority ${row.priority}`}
              style={{
                outline: focusedRow === index ? '2px solid var(--color-info)' : 'none'
              }}
            >
              <td className="py-3 px-4 font-mono text-sm">{row.caseId}</td>
              <td className="py-3 px-4 text-sm">{row.accountId}</td>
              <td className="py-3 px-4">
                <span className={`data-value font-semibold ${getRiskColor(row.riskScore)}`}>
                  {row.riskScore}
                </span>
              </td>
              <td className="py-3 px-4 text-sm">{row.priority}</td>
              <td className="py-3 px-4 text-sm">{row.status}</td>
              <td className="py-3 px-4">
                <button
                  className="text-info hover:text-success transition-colors text-sm focus:outline-none focus:underline"
                  aria-label={`View details for case ${row.caseId}`}
                >
                  View Details →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Case Actions Panel
export function CaseActionsPanel({ caseId, onAction }) {
  const actions = [
    { id: 'assign', label: 'Assign Analyst', icon: '👤', color: 'info' },
    { id: 'escalate', label: 'Escalate', icon: '⚠️', color: 'warning' },
    { id: 'resolve', label: 'Mark Resolved', icon: '✓', color: 'success' },
    { id: 'export', label: 'Export Report', icon: '📄', color: 'investigation' }
  ]

  return (
    <div className="cyber-card p-4">
      <h3 className="font-semibold mb-3 text-sm">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`cyber-btn cyber-btn-${action.color} text-xs py-2`}
          >
            <span className="mr-1">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}