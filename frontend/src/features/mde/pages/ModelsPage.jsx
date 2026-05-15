import { useEffect } from 'react'
import ModelDetailsPanel from '../components/ModelDetailsPanel'
import PageTitle from '../components/PageTitle'
import { useMDEStore } from '../store/useMDEStore'

export default function ModelsPage() {
  const syncDashboard = useMDEStore((s) => s.syncDashboard)
  const syncModelInfo = useMDEStore((s) => s.syncModelInfo)

  useEffect(() => {
    syncDashboard()
    syncModelInfo()
    const timer = setInterval(() => {
      syncDashboard()
      syncModelInfo()
    }, 5000)
    return () => clearInterval(timer)
  }, [syncDashboard, syncModelInfo])

  return (
    <section className="space-y-4">
      <PageTitle
        title="Model Command Center"
        subtitle="Current scoring health, performance trends, and model execution telemetry."
      />
      <ModelDetailsPanel />
    </section>
  )
}
