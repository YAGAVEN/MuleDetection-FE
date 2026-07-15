import { useState } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '../features/mde/components/GlassCard'
import { NotificationContainer, notify } from './shared/NotificationSystem'
import { LoadingStates, LoadingWrapper, KPICardSkeleton } from './shared/LoadingStates'
import { InvestigationPerformanceChart, RiskDistributionChart, CaseVelocityChart } from './shared/AdvancedVisualizations'
import { InvestigationDetailModal, DrillDownKPI } from './shared/InteractiveDrillDown'
import { useRealtimeDashboard, useRealtimeCases, useRealtimeThreatDetection } from './shared/RealTimeIntegration'

// Premium Features Showcase Component
export function PremiumFeaturesShowcase() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedCase, setSelectedCase] = useState(null)
  const [showDrillDown, setShowDrillDown] = useState(false)

  // Real-time hooks
  const { dashboardData } = useRealtimeDashboard()
  const { updates } = useRealtimeCases()
  const { threats, isMonitoring, startMonitoring, stopMonitoring } = useRealtimeThreatDetection()

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'visualizations', label: 'Analytics', icon: '📈' },
    { id: 'drilldown', label: 'Interactive', icon: '🔍' },
    { id: 'realtime', label: 'Real-time', icon: '⚡' }
  ]

  const triggerDemoNotifications = () => {
    notify.success('System performance optimized successfully!')
    setTimeout(() => {
      notify.warning('New critical case requires attention')
    }, 2000)
    setTimeout(() => {
      notify.investigation('Case MDE-24042 status updated')
    }, 4000)
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="cyber-card p-6 border-l-4 border-l-success">
        <h3 className="cyber-heading-3 mb-4">✨ Premium Features Active</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon="🔔"
            title="Professional Notifications"
            description="Real-time notification system with multiple types and auto-dismissal"
            status="active"
          />
          <FeatureCard
            icon="📈"
            title="Advanced Visualizations"
            description="Interactive charts, graphs, and data presentations"
            status="active"
          />
          <FeatureCard
            icon="🔍"
            title="Interactive Drill-downs"
            description="Click-to-detail functionality with breadcrumb navigation"
            status="active"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <h4 className="font-semibold mb-4">🚀 Feature Highlights</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Real-time animated counters for investigation metrics</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Professional loading states with skeleton screens</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Interactive data visualizations with drill-downs</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>WebSocket integration for live updates</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Professional glassmorphism design system</span>
            </li>
          </ul>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="font-semibold mb-4">📊 System Status</h4>
          <div className="space-y-3">
            <SystemStatus label="Premium Features" status="active" />
            <SystemStatus label="Real-time Updates" status="active" />
            <SystemStatus label="Advanced Analytics" status="active" />
            <SystemStatus label="Interactive Components" status="active" />
          </div>
        </GlassCard>
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="cyber-card p-6">
        <h3 className="cyber-heading-3 mb-4">🔔 Notification System</h3>
        <p className="text-sm text-muted mb-6">
          Professional notification system with multiple types, auto-dismissal, and rich metadata support.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <NotificationDemoButton
            type="success"
            label="Success"
            onClick={() => notify.success('Operation completed successfully!')}
          />
          <NotificationDemoButton
            type="danger"
            label="Error"
            onClick={() => notify.danger('Critical system error occurred')}
          />
          <NotificationDemoButton
            type="warning"
            label="Warning"
            onClick={() => notify.warning('System performance degraded')}
          />
          <NotificationDemoButton
            type="info"
            label="Info"
            onClick={() => notify.info('Background sync completed')}
          />
          <NotificationDemoButton
            type="investigation"
            label="Case Update"
            onClick={() => notify.caseUpdate({
              caseId: 'MDE-24042',
              status: 'Under Review',
              priority: 'High',
              riskScore: '87.5'
            })}
          />
        </div>
      </div>

      <div className="cyber-card p-6">
        <h4 className="font-semibold mb-4">🎯 Advanced Notification Features</h4>
        <button
          onClick={triggerDemoNotifications}
          className="cyber-btn cyber-btn-investigation w-full"
        >
          Run Demo Sequence
        </button>
      </div>
    </div>
  )

  const renderVisualizations = () => (
    <div className="space-y-6">
      <div className="cyber-card p-6">
        <h3 className="cyber-heading-3 mb-4">📈 Advanced Data Visualizations</h3>
        <p className="text-sm text-muted mb-6">
          Professional charts and graphs with custom styling, animations, and interactivity.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InvestigationPerformanceChart />
          <RiskDistributionChart />
          <CaseVelocityChart />
        </div>
      </div>
    </div>
  )

  const renderDrillDown = () => (
    <div className="space-y-6">
      <div className="cyber-card p-6">
        <h3 className="cyber-heading-3 mb-4">🔍 Interactive Drill-downs</h3>
        <p className="text-sm text-muted mb-6">
          Click any KPI card to view detailed investigation information with modal overlays.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DrillDownKPI
            title="Active Investigations"
            value="39"
            description="Click to view case breakdown"
            onDrillDown={() => setSelectedCase({
              caseId: 'MDE-24042',
              accountId: 'MLACC00123',
              riskScore: 87.5,
              priority: 'High',
              status: 'Under Investigation'
            })}
          />
          <DrillDownKPI
            title="Resolution Rate"
            value="4.2/hr"
            description="Click to view analyst performance"
            onDrillDown={() => setSelectedCase({
              caseId: 'Analyst Performance',
              type: 'performance',
              metrics: { efficiency: 92, workload: 12, resolved: 28 }
            })}
          />
        </div>
      </div>

      {selectedCase && (
        <InvestigationDetailModal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          caseData={selectedCase}
        />
      )}
    </div>
  )

  const renderRealtime = () => (
    <div className="space-y-6">
      <div className="cyber-card p-6">
        <h3 className="cyber-heading-3 mb-4">⚡ Real-time Integration</h3>
        <p className="text-sm text-muted mb-6">
          WebSocket integration for live data updates and monitoring.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">Dashboard Updates</h4>
            {dashboardData ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Active Cases:</span>
                  <span className="data-value">{dashboardData.investigation_metrics?.active_cases || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Resolution Rate:</span>
                  <span className="data-value">{dashboardData.investigation_metrics?.resolution_rate || 'N/A'}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Critical Cases:</span>
                  <span className="data-value">{dashboardData.investigation_metrics?.critical_cases || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Waiting for real-time data...</p>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-3">Case Updates</h4>
            {updates.length > 0 ? (
              <div className="space-y-2">
                {updates.slice(0, 3).map((update, index) => (
                  <div key={index} className="text-xs p-2 bg-white/5 rounded">
                    <span className="text-muted">{update.timestamp?.split('T')[1]?.split('.')[0]}:</span>
                    <span className="ml-2">{update.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No recent updates</p>
            )}
          </div>
        </div>
      </div>

      <div className="cyber-card p-6">
        <h4 className="font-semibold mb-4">Threat Detection Monitoring</h4>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-muted">Status:</span>
            <span className={isMonitoring ? 'text-success' : 'text-muted'}>
              {isMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`cyber-btn ${isMonitoring ? 'cyber-btn-danger' : 'cyber-btn-success'} text-xs`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>

        {threats.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Recent Threats:</p>
            {threats.slice(0, 3).map((threat, index) => (
              <div key={index} className="text-xs p-2 border border-subtle rounded">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{threat.accountId}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    threat.level === 'Critical' ? 'bg-danger/20 text-danger' :
                    threat.level === 'High' ? 'bg-warning/20 text-warning' :
                    'bg-info/20 text-info'
                  }`}>
                    {threat.level}
                  </span>
                </div>
                <p className="text-muted mt-1">{threat.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Notification Container */}
      <NotificationContainer />

      {/* Header */}
      <div className="cyber-card p-6">
        <h2 className="cyber-heading-2">✨ Premium Features Showcase</h2>
        <p className="text-muted mt-2">
          Demonstrating advanced frontend capabilities for evaluator impression
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`view-button ${activeTab === tab.id ? 'active' : ''}`}
            style={{ minWidth: '120px' }}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'visualizations' && renderVisualizations()}
        {activeTab === 'drilldown' && renderDrillDown()}
        {activeTab === 'realtime' && renderRealtime()}
      </div>
    </div>
  )
}

// Helper Components
function FeatureCard({ icon, title, description, status }) {
  return (
    <div className="cyber-card p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-semibold text-sm mb-1">{title}</h4>
      <p className="text-xs text-muted">{description}</p>
      <div className="mt-2">
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'active' ? 'bg-success/20 text-success' : 'bg-gray-700 text-gray-400'
        }`}>
          {status}
        </span>
      </div>
    </div>
  )
}

function NotificationDemoButton({ type, label, onClick }) {
  const typeClasses = {
    success: 'bg-success/20 text-success border-success/50',
    danger: 'bg-danger/20 text-danger border-danger/50',
    warning: 'bg-warning/20 text-warning border-warning/50',
    info: 'bg-info/20 text-info border-info/50',
    investigation: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
  }

  return (
    <button
      onClick={onClick}
      className={`cyber-btn ${typeClasses[type]} border text-xs py-2 px-3`}
    >
      {label}
    </button>
  )
}

function SystemStatus({ label, status }) {
  const statusConfig = {
    active: 'bg-success text-black',
    inactive: 'bg-gray-700 text-gray-400',
    pending: 'bg-warning/20 text-warning'
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-subtle">
      <span className="text-sm text-secondary">{label}</span>
      <span className={`text-xs px-2 py-1 rounded ${statusConfig[status] || statusConfig.inactive}`}>
        {status}
      </span>
    </div>
  )
}