import { motion } from 'framer-motion'

export default function GlassCard({ className = '', children }) {
  return (
    <motion.section
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border border-cyan-500/20 bg-slate-950/45 backdrop-blur-xl shadow-[0_0_40px_rgba(34,211,238,0.08)] ${className}`}
    >
      {children}
    </motion.section>
  )
}
