import KPICardsGrid from '../components/KPICardsGrid'
import RecentAlertsPanel from '../components/RecentAlertsPanel'
import SystemStatusPanel from '../components/SystemStatusPanel'
import PageTitle from '../components/PageTitle'

export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="Central Intelligence Dashboard"
        subtitle="Live AML telemetry, risk posture, and operational status."
      />
      <KPICardsGrid />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RecentAlertsPanel />
        <SystemStatusPanel />
      </div>
    </section>
  )
}
