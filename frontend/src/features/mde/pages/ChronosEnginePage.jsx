import ChronosPreviewPanel from '../components/ChronosPreviewPanel'
import NetworkGraphPreview from '../components/NetworkGraphPreview'
import PageTitle from '../components/PageTitle'

export default function ChronosEnginePage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="CHRONOS Intelligence"
        subtitle="Replay laundering movement over time and inspect suspicious graph clusters."
      />
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <ChronosPreviewPanel />
        <NetworkGraphPreview />
      </div>
    </section>
  )
}
