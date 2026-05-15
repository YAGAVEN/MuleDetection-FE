import { useEffect } from 'react'
import KPICardsGrid from '../components/KPICardsGrid'
import RecentAlertsPanel from '../components/RecentAlertsPanel'
import SystemStatusPanel from '../components/SystemStatusPanel'
import PageTitle from '../components/PageTitle'
import { useMDEStore } from '../store/useMDEStore'

export default function DashboardPage() {
  const syncDashboard = useMDEStore((s) => s.syncDashboard)
  const dashboardStatus = useMDEStore((s) => s.dashboardStatus)
  const dashboardStatusMessage = useMDEStore((s) => s.dashboardStatusMessage)

  useEffect(() => {
    syncDashboard()
    const timer = setInterval(() => {
      syncDashboard()
    }, 5000)
    return () => clearInterval(timer)
  }, [syncDashboard])

  return (
    <section className="space-y-4">
      <PageTitle
        title="Central Intelligence Dashboard"
        subtitle="Live AML telemetry, risk posture, and operational status."
      />
      <div
        className={`rounded-xl border px-3 py-2 text-xs ${
          dashboardStatus === 'offline'
            ? 'border-rose-300/35 bg-rose-500/10 text-rose-100'
            : 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100'
        }`}
      >
        Dashboard status: {dashboardStatus === 'offline' ? 'OFFLINE' : 'ONLINE'} · {dashboardStatusMessage}
      </div>
      <KPICardsGrid />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RecentAlertsPanel />
        <SystemStatusPanel />
      </div>
    </section>
  )
}
