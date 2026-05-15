import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const toneClasses = {
  cyan: 'from-cyan-300 to-cyan-500 text-cyan-200',
  violet: 'from-violet-300 to-violet-500 text-violet-200',
  rose: 'from-rose-300 to-rose-500 text-rose-200',
  indigo: 'from-indigo-300 to-indigo-500 text-indigo-200',
  emerald: 'from-emerald-300 to-emerald-500 text-emerald-200',
}

const strokeTone = {
  cyan: '#22d3ee',
  violet: '#a78bfa',
  rose: '#fb7185',
  indigo: '#818cf8',
  emerald: '#34d399',
}

export default function KPICardsGrid() {
  const cards = useMDEStore((s) => s.kpis)
  if (!cards.length) {
    return (
      <GlassCard className="p-4">
        <p className="text-sm text-slate-300">No live KPI data available.</p>
      </GlassCard>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
        >
          <GlassCard className="p-4 h-full">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">{card.title}</p>
                <p className="text-2xl font-semibold text-white mt-1">{card.value}</p>
              </div>
              <div className={`text-xs px-2 py-1 rounded-md border ${card.positive ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' : 'border-amber-300/40 text-amber-200 bg-amber-500/10'}`}>
                {card.trend}
              </div>
            </div>
            <div className="h-14 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={card.spark.map((value, i) => ({ i, value }))}>
                  <defs>
                    <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeTone[card.color] || strokeTone.cyan} stopOpacity={0.55} />
                      <stop offset="95%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={strokeTone[card.color] || strokeTone.cyan}
                    className={toneClasses[card.color] || toneClasses.cyan}
                    strokeWidth={2}
                    fill={`url(#grad-${card.id})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  )
}
