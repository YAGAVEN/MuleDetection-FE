import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

export default function HydraLogsPanel() {
  const logs = useMDEStore((s) => s.hydraLogs)

  return (
    <GlassCard className="p-5">
      <h3 className="text-white font-semibold">Hydra Logs</h3>
      <div className="mt-4 rounded-xl border border-cyan-300/20 bg-slate-950/80 p-3 font-mono text-xs text-cyan-200 space-y-1 h-40 overflow-auto">
        {logs.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    </GlassCard>
  )
}
