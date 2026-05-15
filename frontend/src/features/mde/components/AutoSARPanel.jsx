import { FileCheck2, FileOutput, ShieldAlert } from 'lucide-react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

export default function AutoSARPanel() {
  const queue = useMDEStore((s) => s.sarQueue)

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Auto-SAR Queue</h3>
        <div className="text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-300/30 px-2 py-1 rounded-lg">
          Compliance validation online
        </div>
      </div>
      <div className="space-y-3">
        {queue.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-cyan-200 font-semibold">{item.id}</p>
                <p className="text-slate-400 text-xs">{item.caseId} · Analyst {item.analyst}</p>
              </div>
              <p className="text-slate-300">{item.status}</p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${item.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button className="px-3 py-2 rounded-lg border border-cyan-300/30 bg-cyan-500/10 text-cyan-100 text-xs inline-flex items-center gap-1"><FileCheck2 size={14} /> Generate Report</button>
        <button className="px-3 py-2 rounded-lg border border-violet-300/30 bg-violet-500/10 text-violet-100 text-xs inline-flex items-center gap-1"><FileOutput size={14} /> Export</button>
        <button className="px-3 py-2 rounded-lg border border-rose-300/30 bg-rose-500/10 text-rose-100 text-xs inline-flex items-center gap-1"><ShieldAlert size={14} /> Notes Preview</button>
      </div>
    </GlassCard>
  )
}
