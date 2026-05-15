import AutoSARPanel from '../components/AutoSARPanel'
import SystemStatusPanel from '../components/SystemStatusPanel'
import PageTitle from '../components/PageTitle'

export default function AutoSARPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="Auto-SAR Operations"
        subtitle="Queue management, compliance checks, and investigator-ready report output."
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AutoSARPanel />
        <SystemStatusPanel />
      </div>
    </section>
  )
}
