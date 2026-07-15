import { motion } from 'framer-motion'

export default function GlassCard({
  className = '',
  children,
  variant = 'default',
  interactive = true,
  focusable = false
}) {
  // Professional cyber security glassmorphism variants
  const variants = {
    default: 'border-gray-700/30 bg-black/60',
    elevated: 'border-gray-600/40 bg-black/70',
    success: 'border-green-500/30 bg-green-950/20',
    danger: 'border-red-500/30 bg-red-950/20',
    warning: 'border-amber-500/30 bg-amber-950/20',
    investigation: 'border-purple-500/30 bg-purple-950/20',
    info: 'border-cyan-500/30 bg-cyan-950/20'
  }

  const shadows = {
    default: 'shadow-[0_0_40px_rgba(0,0,0,0.6)]',
    elevated: 'shadow-[0_0_60px_rgba(0,0,0,0.8)]',
    success: 'shadow-[0_0_40px_rgba(0,255,135,0.15)]',
    danger: 'shadow-[0_0_40px_rgba(255,59,59,0.15)]',
    warning: 'shadow-[0_0_40px_rgba(255,184,0,0.15)]',
    investigation: 'shadow-[0_0_40px_rgba(157,78,221,0.15)]',
    info: 'shadow-[0_0_40px_rgba(0,212,255,0.15)]'
  }

  const selectedVariant = variants[variant] || variants.default
  const selectedShadow = shadows[variant] || shadows.default

  // Enhanced micro-interactions
  const hoverEffects = interactive ? {
    whileHover: {
      y: -4,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    whileTap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  } : {}

  // Focus styles for accessibility
  const focusStyles = focusable ? {
    onFocus: (e) => {
      e.currentTarget.style.boxShadow = `0 0 0 2px rgba(0, 212, 255, 0.5), ${selectedShadow.includes('shadow') ? selectedShadow : 'shadow-[0_0_40px_rgba(0,0,0,0.6)]'}`
    },
    onBlur: (e) => {
      e.currentTarget.style.boxShadow = ''
    }
  } : {}

  return (
    <motion.section
      {...hoverEffects}
      {...focusStyles}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`rounded-xl border backdrop-blur-xl ${selectedVariant} ${selectedShadow} ${className} ${interactive ? 'cursor-pointer' : ''} ${focusable ? 'focus:outline-none' : ''}`}
      style={{
        background: 'rgba(10, 10, 15, 0.8)',
        WebkitBackdropFilter: 'blur(16px)',
        backdropFilter: 'blur(16px)'
      }}
      tabIndex={focusable ? 0 : undefined}
      role={focusable ? 'button' : undefined}
      aria-label={focusable ? 'Interactive card component' : undefined}
    >
      {/* Subtle inner glow effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
          mixBlendMode: 'overlay'
        }}
      />

      {children}
    </motion.section>
  )
}