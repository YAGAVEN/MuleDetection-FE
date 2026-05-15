import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Terminal, Activity, RefreshCcw } from 'lucide-react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

export default function HydraPanel() {
  const logs = useMDEStore((s) => s.hydraLogs)
  const hydraBattle = useMDEStore((s) => s.hydraBattle)
  const syncHydraBattleStatus = useMDEStore((s) => s.syncHydraBattleStatus)
  const startHydraBattle = useMDEStore((s) => s.startHydraBattle)
  const stopHydraBattle = useMDEStore((s) => s.stopHydraBattle)
  const connectHydraEvents = useMDEStore((s) => s.connectHydraEvents)
  const disconnectHydraEvents = useMDEStore((s) => s.disconnectHydraEvents)

  useEffect(() => {
    syncHydraBattleStatus()
    connectHydraEvents()
    const timer = setInterval(() => {
      syncHydraBattleStatus()
    }, 3000)
    return () => {
      clearInterval(timer)
      disconnectHydraEvents()
    }
  }, [connectHydraEvents, disconnectHydraEvents, syncHydraBattleStatus])

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">HYDRA Defense Console</h3>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          className="text-xs text-violet-200 bg-violet-500/10 border border-violet-300/30 px-3 py-1 rounded-lg"
        >
          {hydraBattle?.is_running ? 'Adversarial retraining active' : 'Adversarial retraining idle'}
        </motion.div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => startHydraBattle(50, 2)}
          className="h-8 px-3 rounded-md border border-emerald-300/30 bg-emerald-500/10 text-emerald-100 text-xs"
        >
          Start Battle
        </button>
        <button
          type="button"
          onClick={() => stopHydraBattle()}
          className="h-8 px-3 rounded-md border border-rose-300/30 bg-rose-500/10 text-rose-100 text-xs"
        >
          Stop Battle
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ['Detection Resilience', `${Number(hydraBattle?.resilience_score || 0).toFixed(1)}%`, Shield],
          ['Active Attack', hydraBattle?.active_attack_type || 'none', Activity],
          ['Attack Patterns', `${hydraBattle?.synthetic_patterns_generated || 0}`, Terminal],
          ['Retraining Cycles', `${hydraBattle?.round || 0}`, RefreshCcw],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-lg text-white font-semibold mt-1">{value}</p>
            <Icon size={14} className="text-cyan-200 mt-2" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-cyan-300/20 bg-slate-950/80 p-3 font-mono text-xs text-cyan-200 space-y-1 h-36 overflow-auto">
        {logs.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </GlassCard>
  )
}
