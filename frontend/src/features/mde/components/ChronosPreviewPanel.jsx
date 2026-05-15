import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

export default function ChronosPreviewPanel() {
  const chronosSeries = useMDEStore((s) => s.chronosSeries)
  const chronosPlaying = useMDEStore((s) => s.chronosPlaying)
  const toggleChronos = useMDEStore((s) => s.toggleChronos)

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">CHRONOS Visualization Preview</h3>
        <div className="text-xs text-cyan-200 bg-cyan-500/10 border border-cyan-300/30 px-2 py-1 rounded-lg">
          Transaction flow playback
        </div>
      </div>
      <div className="h-56 rounded-xl bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_60%)] border border-white/10 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chronosSeries}>
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="heatFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="time" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155' }} />
            <Area type="monotone" dataKey="risk" stroke="#22d3ee" fill="url(#riskFill)" strokeWidth={2} />
            <Area type="monotone" dataKey="heat" stroke="#a78bfa" fill="url(#heatFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-slate-200 flex items-center justify-center"><SkipBack size={15} /></button>
          <button onClick={toggleChronos} className="h-9 w-9 rounded-lg border border-cyan-300/35 bg-cyan-500/10 text-cyan-100 flex items-center justify-center">
            {chronosPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-slate-200 flex items-center justify-center"><SkipForward size={15} /></button>
        </div>
        <p className="text-xs text-slate-400">Timeline animation · heatmap overlay · laundering sequence unfolding over time</p>
      </div>
    </GlassCard>
  )
}
