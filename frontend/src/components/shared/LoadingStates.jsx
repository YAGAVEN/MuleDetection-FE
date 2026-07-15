import { motion } from 'framer-motion'

// Professional Loading Components

export function SkeletonLoader({ className = '', height = 'h-20', width = 'w-full' }) {
  return (
    <div
      className={`cyber-skeleton rounded-lg ${className} ${height} ${width}`}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export function LoadingSpinner({ size = 'default', message = 'Processing...' }) {
  const sizes = {
    small: 'w-4 h-4 border-2',
    default: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div
        className={`${sizes[size]} border-gray-700 border-t-success rounded-full cyber-spinner`}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">{message}</span>
      </div>
      {message && (
        <p className="text-sm text-muted animate-pulse">{message}</p>
      )}
    </div>
  )
}

export function DataLoadingCard({ title = 'Loading Data...' }) {
  return (
    <div className="cyber-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLoader height="h-6" width="w-32" />
        <SkeletonLoader height="h-8" width="w-20" />
      </div>
      <SkeletonLoader height="h-16" />
      <div className="space-y-2">
        <SkeletonLoader height="h-4" width="w-full" />
        <SkeletonLoader height="h-4" width="w-3/4" />
      </div>
    </div>
  )
}

export function KPICardSkeleton() {
  return (
    <div className="cyber-card p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <SkeletonLoader height="h-10 w-10" />
          <div className="space-y-2">
            <SkeletonLoader height="h-4 w-24" />
            <SkeletonLoader height="h-3 w-32" />
          </div>
        </div>
        <SkeletonLoader height="h-6 w-16" />
      </div>
      <SkeletonLoader height="h-8 w-20 mb-4" />
      <SkeletonLoader height="h-12 w-full" />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-subtle">
        <SkeletonLoader height="h-4 w-24" />
        <SkeletonLoader height="h-4 w-20" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <SkeletonLoader height="h-10" width="w-full" />
        <SkeletonLoader height="h-10" width="w-20" />
        <SkeletonLoader height="h-10" width="w-20" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-subtle">
          <SkeletonLoader height="h-8" width="w-16" />
          <SkeletonLoader height="h-8" width="w-24" />
          <SkeletonLoader height="h-8" width="w-full" />
          <SkeletonLoader height="h-8" width="w-20" />
          <SkeletonLoader height="h-8" width="w-16" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ aspectRatio = 'aspect-video' }) {
  return (
    <div className={`cyber-card p-6 ${aspectRatio}`}>
      <div className="flex items-center justify-between mb-6">
        <SkeletonLoader height="h-6" width="w-32" />
        <SkeletonLoader height="h-8" width="w-24" />
      </div>
      <SkeletonLoader height="h-48" width="full" />
      <div className="flex items-center justify-center gap-8 mt-6">
        <SkeletonLoader height="h-4" width="w-16" />
        <SkeletonLoader height="h-4" width="w-16" />
        <SkeletonLoader height="h-4" width="w-16" />
      </div>
    </div>
  )
}

export function FullPageLoader({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 border-4 border-gray-700 border-t-success rounded-full cyber-spinner"></div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h3 className="text-lg font-semibold mb-2">{message}</h3>
        <p className="text-sm text-muted animate-pulse">Please wait...</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2"
      >
        <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </motion.div>
    </div>
  )
}

export function InlineLoader({ text = 'Processing...' }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-4 h-4 border-2 border-gray-700 border-t-success rounded-full cyber-spinner"></div>
      <span className="text-muted">{text}</span>
    </div>
  )
}

// Loading state wrapper component
export function LoadingWrapper({
  isLoading,
  children,
  skeleton = <KPICardSkeleton />,
  error = null,
  errorMessage = 'Failed to load data'
}) {
  if (isLoading) {
    return <>{skeleton}</>
  }

  if (error) {
    return (
      <div className="cyber-card p-6 border-l-4 border-l-danger">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-danger">Error Loading Data</h3>
            <p className="text-sm text-muted">{errorMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Pulse loader for live updates
export function LiveUpdateIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-success"></div>
        <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-success animate-ping"></div>
      </div>
      <span className="text-success font-medium">LIVE</span>
    </div>
  )
}