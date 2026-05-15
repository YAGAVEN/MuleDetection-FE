import KPICardsGrid from '../components/KPICardsGrid'
import PageTitle from '../components/PageTitle'

export default function ModelsPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="Model Command Center"
        subtitle="Current scoring health, performance trends, and model execution telemetry."
      />
      <KPICardsGrid />
    </section>
  )
}
