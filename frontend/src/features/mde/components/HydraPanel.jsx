import { motion } from 'framer-motion'
import { Shield, Terminal, Activity, RefreshCcw } from 'lucide-react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

export default function HydraPanel() {
  const logs = useMDEStore((s) => s.hydraLogs)

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">HYDRA Defense Console</h3>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          className="text-xs text-violet-200 bg-violet-500/10 border border-violet-300/30 px-3 py-1 rounded-lg"
        >
          Adversarial retraining active
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ['Detection Resilience', '94.2%', Shield],
          ['Model Drift', '0.12σ', Activity],
          ['Attack Patterns', '128', Terminal],
          ['Retraining Cycles', '31', RefreshCcw],
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
