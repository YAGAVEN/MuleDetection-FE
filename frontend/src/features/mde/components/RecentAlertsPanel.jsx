import { AlertTriangle } from 'lucide-react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const alertTone = {
  critical: 'border-rose-300/35 bg-rose-500/10 text-rose-100',
  high: 'border-orange-300/35 bg-orange-500/10 text-orange-100',
  medium: 'border-cyan-300/35 bg-cyan-500/10 text-cyan-100',
  low: 'border-slate-300/30 bg-slate-500/10 text-slate-200',
}

export default function RecentAlertsPanel() {
  const alerts = useMDEStore((s) => s.alerts)

  return (
    <GlassCard className="p-5">
      <h3 className="text-white font-semibold mb-3">Recent Alerts</h3>
      {!alerts.length ? (
        <p className="text-sm text-slate-300">No live alerts available.</p>
      ) : null}
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className={`rounded-lg border p-3 ${alertTone[alert.severity]}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase tracking-wider">{alert.id}</p>
              <p className="text-[11px] opacity-80">{alert.time}</p>
            </div>
            <p className="text-xs leading-5 flex items-start gap-2">
              <AlertTriangle size={13} className="mt-0.5" />
              {alert.text}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
