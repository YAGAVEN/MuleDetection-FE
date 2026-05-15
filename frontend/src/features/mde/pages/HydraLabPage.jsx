import HydraPanel from '../components/HydraPanel'
import SystemStatusPanel from '../components/SystemStatusPanel'
import PageTitle from '../components/PageTitle'

export default function HydraLabPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="HYDRA Lab"
        subtitle="Adversarial resilience, model drift monitoring, and retraining activity."
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HydraPanel />
        <SystemStatusPanel />
      </div>
    </section>
  )
}
