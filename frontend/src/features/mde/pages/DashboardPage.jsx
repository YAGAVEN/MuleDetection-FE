import { useEffect, useState } from 'react'
import InvestigationKPICards from '../components/InvestigationKPICards'
import RecentAlertsPanel from '../components/RecentAlertsPanel'
import SystemStatusPanel from '../components/SystemStatusPanel'
import PageTitle from '../components/PageTitle'
import { useMDEStore } from '../store/useMDEStore'
import { NotificationContainer, useEventNotifications } from '../../../components/shared/NotificationSystem'
import { InvestigationPerformanceChart, RiskDistributionChart, CaseVelocityChart } from '../../../components/shared/AdvancedVisualizations'
import { LoadingWrapper } from '../../../components/shared/LoadingStates'
import { useRealtimeDashboard, useRealtimeCases } from '../../../components/shared/RealTimeIntegration'

export default function DashboardPage() {
  const syncDashboard = useMDEStore((s) => s.syncDashboard)
  const dashboardStatus = useMDEStore((s) => s.dashboardStatus)
  const dashboardStatusMessage = useMDEStore((s) => s.dashboardStatusMessage)
  const dashboardData = useMDEStore((s) => s.dashboardData)

  // Premium features hooks
  const { dashboardData: realtimeData } = useRealtimeDashboard()
  const { updates: caseUpdates } = useRealtimeCases()
  useEventNotifications() // Enable event notifications

  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    syncDashboard()
    const timer = setInterval(() => {
      syncDashboard()
    }, 5000)

    // Simulate initial loading
    setTimeout(() => setIsLoading(false), 1500)

    return () => clearInterval(timer)
  }, [syncDashboard])

  return (
    <section className="space-y-6">
      {/* Notification System */}
      <NotificationContainer />

      <PageTitle
        title="Central Intelligence Dashboard"
        subtitle="Live AML telemetry, risk posture, and operational status."
      />

      {/* Enhanced Status Bar */}
      <div
        className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
          dashboardStatus === 'offline'
            ? 'border-rose-300/35 bg-rose-500/10'
            : 'border-emerald-300/35 bg-emerald-500/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
          <span className="text-xs font-medium">
            Dashboard: {dashboardStatus === 'offline' ? 'OFFLINE' : 'ONLINE'}
          </span>
          <span className="text-xs text-muted">·</span>
          <span className="text-xs">{dashboardStatusMessage}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
            <span className="text-purple-300">PREMIUM FEATURES ACTIVE</span>
          </div>
          {caseUpdates.length > 0 && (
            <div className="text-xs text-info">
              📡 {caseUpdates.length} live updates
            </div>
          )}
        </div>
      </div>

      {/* Investigation KPI Cards with Loading State */}
      <LoadingWrapper
        isLoading={isLoading}
        skeleton={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="cyber-card p-5 h-32 animate-pulse"></div>
          ))}
        </div>}
      >
        <InvestigationKPICards />
      </LoadingWrapper>

      {/* Premium Features Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="cyber-heading-3">Advanced Analytics</h3>
        <button
          onClick={() => setShowAdvancedCharts(!showAdvancedCharts)}
          className="cyber-btn cyber-btn-ghost text-xs py-2 px-4"
        >
          {showAdvancedCharts ? 'Hide Charts' : 'Show Charts'}
        </button>
      </div>

      {/* Advanced Visualizations */}
      {showAdvancedCharts && (
        <LoadingWrapper isLoading={isLoading}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InvestigationPerformanceChart />
            <RiskDistributionChart />
            <CaseVelocityChart />
            <div className="cyber-card p-6">
              <h3 className="cyber-heading-3 mb-4">Real-time System Performance</h3>
              <div className="space-y-4">
                <PerformanceBar
                  label="API Response Time"
                  value={85}
                  color="success"
                  description="85ms average"
                />
                <PerformanceBar
                  label="Database Query Time"
                  value={92}
                  color="info"
                  description="92ms average"
                />
                <PerformanceBar
                  label="ML Model Inference"
                  value={78}
                  color="warning"
                  description="78ms average"
                />
                <PerformanceBar
                  label="WebSocket Latency"
                  value={95}
                  color="success"
                  description="15ms average"
                />
              </div>
            </div>
          </div>
        </LoadingWrapper>
      )}

      {/* Standard Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RecentAlertsPanel />
        <SystemStatusPanel />
      </div>

      {/* Real-time Updates Footer */}
      {caseUpdates.length > 0 && (
        <div className="cyber-card p-4 border-l-4 border-l-info">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl">📡</div>
              <div>
                <h4 className="font-semibold text-sm">Live Updates Active</h4>
                <p className="text-xs text-muted">
                  Receiving real-time case updates and system notifications
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="data-label">Updates</div>
              <div className="data-value text-info">{caseUpdates.length}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// Performance Bar Component
function PerformanceBar({ label, value, color, description }) {
  const colorClasses = {
    success: 'bg-success',
    info: 'bg-info',
    warning: 'bg-warning',
    danger: 'bg-danger'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-secondary">{label}</span>
        <span className="text-muted">{description}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-right text-xs text-muted">
        {value}% efficiency
      </div>
    </div>
  )
}