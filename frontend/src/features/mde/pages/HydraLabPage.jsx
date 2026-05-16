import { Play, Square, Swords } from 'lucide-react'
import HydraPanel from '../components/HydraPanel'
import HydraLogsPanel from '../components/HydraLogsPanel'
import SystemStatusPanel from '../components/SystemStatusPanel'
import PageTitle from '../components/PageTitle'
import { useMDEStore } from '../store/useMDEStore'

export default function HydraLabPage() {
  const hydraBattle = useMDEStore((s) => s.hydraBattle)
  const startHydraBattle = useMDEStore((s) => s.startHydraBattle)
  const stopHydraBattle = useMDEStore((s) => s.stopHydraBattle)

  return (
    <section className="space-y-4">
      <PageTitle
        title="HYDRA Lab"
        subtitle="Adversarial resilience, model drift monitoring, and retraining activity."
      />
      <div className="rounded-xl border border-violet-300/25 bg-violet-500/10 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-violet-200" />
          <p className="text-sm text-violet-100">
            Orchestration: <span className="font-semibold">{hydraBattle?.is_running ? 'RUNNING' : 'IDLE'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startHydraBattle(50, 2)}
            className="h-9 px-3 rounded-md border border-emerald-300/35 bg-emerald-500/15 text-emerald-100 text-sm inline-flex items-center gap-1.5"
          >
            <Play size={14} />
            Start Attack Orchestration
          </button>
          <button
            type="button"
            onClick={() => stopHydraBattle()}
            className="h-9 px-3 rounded-md border border-rose-300/35 bg-rose-500/15 text-rose-100 text-sm inline-flex items-center gap-1.5"
          >
            <Square size={14} />
            Stop
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <HydraPanel />
        <HydraLogsPanel />
        <SystemStatusPanel />
      </div>
    </section>
  )
}
