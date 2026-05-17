import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Database,
  Gauge,
  Play,
  RefreshCcw,
  Shield,
  Square,
  Swords,
  Target,
  Terminal,
  Zap,
} from 'lucide-react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const formatPercent = (value, fallback = 'Awaiting') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback
  }
  const numeric = Number(value)
  const percent = numeric <= 1 ? numeric * 100 : numeric
  return `${percent.toFixed(1)}%`
}

const formatModel = (value) => {
  if (!value) return 'pending'
  return String(value).replace(/_/g, ' ')
}

function MetricTile({ label, value, Icon, tone = 'cyan' }) {
  const toneClass = {
    cyan: 'text-cyan-200 bg-cyan-400/10 border-cyan-300/20',
    emerald: 'text-emerald-200 bg-emerald-400/10 border-emerald-300/20',
    rose: 'text-rose-200 bg-rose-400/10 border-rose-300/20',
    amber: 'text-amber-200 bg-amber-400/10 border-amber-300/20',
    violet: 'text-violet-200 bg-violet-400/10 border-violet-300/20',
  }[tone]

  return (
    <div className={`min-h-24 rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-300">{label}</p>
        <Icon size={15} />
      </div>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

export default function HydraPanel() {
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
    }, 2500)
    return () => {
      clearInterval(timer)
      disconnectHydraEvents()
    }
  }, [connectHydraEvents, disconnectHydraEvents, syncHydraBattleStatus])

  const isRunning = Boolean(hydraBattle?.is_running)
  const round = Number(hydraBattle?.round || 0)
  const targetRounds = Number(hydraBattle?.rounds_target || 0)
  const progress = targetRounds > 0 ? Math.min(100, (round / targetRounds) * 100) : 0
  const attackType = formatModel(hydraBattle?.active_attack_type || 'none')
  const modelVersion = hydraBattle?.current_model_version || 'ensemble_v1.0-runtime'
  const gnnVersion = hydraBattle?.gnn_model_version || 'gnn_v1.0-runtime'
  const weights = hydraBattle?.updated_weights || {}
  const confusion = hydraBattle?.confusion_matrix || {}

  const packetTransition = {
    repeat: isRunning ? Infinity : 0,
    duration: 1.35,
    ease: 'easeInOut',
  }

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold">HYDRA Defense Console</h3>
          <p className="mt-1 text-xs text-slate-400">
            Round {round}{targetRounds ? `/${targetRounds}` : ''} · Source {(hydraBattle?.attack_source || 'mock').toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startHydraBattle(50, 2)}
            disabled={isRunning}
            className="h-9 px-3 rounded-md border border-emerald-300/35 bg-emerald-500/15 text-emerald-100 text-sm inline-flex items-center gap-1.5"
          >
            <Play size={14} />
            Start
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

      <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1fr]">
          <div className="p-4 border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2 text-rose-100">
              <Swords size={18} />
              <span className="text-sm font-semibold">Attacker</span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{attackType}</p>
            <p className="mt-1 text-xs text-slate-400">{hydraBattle?.synthetic_patterns_generated || 0} payloads generated</p>
            <div className="mt-4 h-2 rounded-full bg-rose-950">
              <motion.div
                className="h-full rounded-full bg-rose-400"
                animate={{ width: `${Math.min(100, Number(hydraBattle?.attack_success_rate || 0) * 100)}%` }}
                transition={{ duration: 0.45 }}
              />
            </div>
          </div>

          <div className="relative min-h-56 p-4">
            <div className="absolute left-[16%] right-[16%] top-1/2 h-px bg-cyan-300/25" />
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="absolute top-1/2 h-2 w-10 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.75)]"
                initial={{ left: '18%', opacity: 0 }}
                animate={
                  isRunning
                    ? { left: ['18%', '78%'], opacity: [0, 1, 1, 0] }
                    : { left: `${18 + progress * 0.6}%`, opacity: 0.45 }
                }
                transition={{ ...packetTransition, delay: index * 0.32 }}
              />
            ))}
            <div className="relative z-10 flex h-full min-h-48 items-center justify-between gap-4">
              <motion.div
                animate={isRunning ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ repeat: isRunning ? Infinity : 0, duration: 1.6 }}
                className="grid h-24 w-24 place-items-center rounded-full border border-rose-300/30 bg-rose-500/10"
              >
                <Zap className="text-rose-200" size={30} />
              </motion.div>
              <div className="min-w-0 flex-1 text-center">
                <p className="text-xs uppercase text-slate-500">Mock Payload vs Defender Model</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatPercent(hydraBattle?.detection_rate, '0.0%')}</p>
                <p className="mt-1 text-xs text-slate-400">detected in current battle</p>
                <div className="mt-4 h-2 rounded-full bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-cyan-300"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.45 }}
                  />
                </div>
              </div>
              <motion.div
                animate={isRunning ? { boxShadow: ['0 0 0 rgba(52,211,153,0)', '0 0 32px rgba(52,211,153,0.35)', '0 0 0 rgba(52,211,153,0)'] } : {}}
                transition={{ repeat: isRunning ? Infinity : 0, duration: 1.8 }}
                className="grid h-24 w-24 place-items-center rounded-full border border-emerald-300/30 bg-emerald-500/10"
              >
                <Shield className="text-emerald-200" size={32} />
              </motion.div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 text-emerald-100">
              <Shield size={18} />
              <span className="text-sm font-semibold">Defender</span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{formatPercent(hydraBattle?.model_accuracy)}</p>
            <p className="mt-1 text-xs text-slate-400">{hydraBattle?.baseline_samples || 0} labeled samples tested</p>
            <div className="mt-4 h-2 rounded-full bg-emerald-950">
              <motion.div
                className="h-full rounded-full bg-emerald-400"
                animate={{ width: `${Math.min(100, Number(hydraBattle?.adversarial_accuracy || 0) * 100)}%` }}
                transition={{ duration: 0.45 }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricTile label="Adversarial Accuracy" value={formatPercent(hydraBattle?.adversarial_accuracy, '0.0%')} Icon={Target} tone="emerald" />
        <MetricTile label="Attack Success" value={formatPercent(hydraBattle?.attack_success_rate, '0.0%')} Icon={Activity} tone="rose" />
        <MetricTile label="Patterns Blocked" value={`${hydraBattle?.detected_patterns || 0}`} Icon={Terminal} tone="cyan" />
        <MetricTile label="Retraining Cycles" value={`${round}`} Icon={RefreshCcw} tone="violet" />
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-cyan-100">
            <Gauge size={16} />
            <span className="text-sm font-semibold">Training Results</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">Baseline detection</p>
              <p className="mt-1 text-white font-semibold">{formatPercent(hydraBattle?.baseline_detection_rate, '0.0%')}</p>
            </div>
            <div>
              <p className="text-slate-500">Evaluated attacks</p>
              <p className="mt-1 text-white font-semibold">{hydraBattle?.attacks_evaluated || 0}</p>
            </div>
            <div>
              <p className="text-slate-500">True positives</p>
              <p className="mt-1 text-white font-semibold">{confusion.true_positive ?? 0}</p>
            </div>
            <div>
              <p className="text-slate-500">False negatives</p>
              <p className="mt-1 text-white font-semibold">{confusion.false_negative ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-emerald-100">
            <Database size={16} />
            <span className="text-sm font-semibold">Model Update</span>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-slate-500">Ensemble</p>
              <p className="mt-1 truncate text-white font-semibold" title={modelVersion}>{formatModel(modelVersion)}</p>
            </div>
            <div>
              <p className="text-slate-500">GNN</p>
              <p className="mt-1 truncate text-white font-semibold" title={gnnVersion}>{formatModel(gnnVersion)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-slate-400">LGBM weight: <span className="text-white">{weights.lgbm ?? '0.60'}</span></p>
              <p className="text-slate-400">GNN weight: <span className="text-white">{weights.gnn ?? '0.40'}</span></p>
            </div>
          </div>
        </div>
      </div>

    </GlassCard>
  )
}
