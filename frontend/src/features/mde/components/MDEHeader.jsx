import { motion } from 'framer-motion'
import { Bell, Circle, Search, ShieldAlert, UserCircle2 } from 'lucide-react'
import { useMDEStore } from '../store/useMDEStore'

export default function MDEHeader() {
  const query = useMDEStore((s) => s.query)
  const setQuery = useMDEStore((s) => s.setQuery)

  return (
    <header className="rounded-2xl border border-cyan-300/20 bg-slate-950/55 backdrop-blur-xl p-4 sm:p-5 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/25 to-violet-500/35 border border-cyan-300/30 flex items-center justify-center">
          <ShieldAlert className="text-cyan-200" size={20} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">TriNetra</p>
          <h1 className="text-white text-lg sm:text-xl font-semibold">MDE — Mule Detection Engine</h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300/70" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts, cases, patterns…"
            className="w-full md:w-80 h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-300/60"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-200">
            <Bell size={18} />
          </button>
          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-300/25 text-xs text-emerald-200 flex items-center gap-2">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            >
              <Circle size={10} fill="currentColor" />
            </motion.span>
            System Live
          </div>
          <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-300/25 text-xs text-rose-200">
            AML Risk: ELEVATED
          </div>
          <div className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 flex items-center gap-2 text-sm">
            <UserCircle2 size={18} />
            Ops Lead
          </div>
        </div>
      </div>
    </header>
  )
}
