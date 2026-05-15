import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../constants/navigation'
import { useMDEStore } from '../store/useMDEStore'

export default function MDESidebar() {
  const sidebarCollapsed = useMDEStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useMDEStore((s) => s.setSidebarCollapsed)

  return (
    <aside className={`h-screen sticky top-0 z-30 border-r border-cyan-400/15 bg-slate-950/80 backdrop-blur-xl transition-all duration-300 ${sidebarCollapsed ? 'w-[84px]' : 'w-[260px]'}`}>
      <div className="h-full p-4 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/30 border border-cyan-300/30 flex items-center justify-center">
              <ShieldCheck className="text-cyan-300" size={22} />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">TriNetra</p>
                  <p className="text-sm font-semibold text-white">Intel Stack</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/20">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border-cyan-300/45 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200'
                  }`
                }
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
