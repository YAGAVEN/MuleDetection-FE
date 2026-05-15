import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

export default function SystemStatusPanel() {
  const health = useMDEStore((s) => s.systemHealth)

  return (
    <GlassCard className="p-5">
      <h3 className="text-white font-semibold mb-3">System Status</h3>
      {!health.length ? (
        <p className="text-sm text-slate-300">No live system status available.</p>
      ) : null}
      <div className="space-y-3">
        {health.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">{item.label}</span>
              <span className="text-cyan-200">{item.value} · {item.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
