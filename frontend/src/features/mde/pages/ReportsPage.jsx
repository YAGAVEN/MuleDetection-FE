import AutoSARPanel from '../components/AutoSARPanel'
import RecentAlertsPanel from '../components/RecentAlertsPanel'
import PageTitle from '../components/PageTitle'

export default function ReportsPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="Reports"
        subtitle="Compliance reporting queue and recent forensic alert context."
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AutoSARPanel />
        <RecentAlertsPanel />
      </div>
    </section>
  )
}
