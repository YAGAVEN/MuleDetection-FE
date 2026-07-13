import { create } from 'zustand'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

// Notification store
export const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now()
    const newNotification = {
      id,
      ...notification,
      timestamp: new Date(),
      duration: notification.duration || 5000
    }
    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }))

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }))
    }, newNotification.duration)

    return id
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
  },
  clearNotifications: () => set({ notifications: [] })
}))

// Notification variants
const notificationVariants = {
  success: {
    icon: '✓',
    color: 'text-success',
    borderColor: 'border-success',
    bgColor: 'bg-success/10',
    glow: 'glow-success'
  },
  danger: {
    icon: '✕',
    color: 'text-danger',
    borderColor: 'border-danger',
    bgColor: 'bg-danger/10',
    glow: 'glow-danger'
  },
  warning: {
    icon: '⚠',
    color: 'text-warning',
    borderColor: 'border-warning',
    bgColor: 'bg-warning/10',
    glow: 'glow-warning'
  },
  info: {
    icon: 'ℹ',
    color: 'text-info',
    borderColor: 'border-info',
    bgColor: 'bg-info/10',
    glow: 'glow-info'
  },
  investigation: {
    icon: '🔍',
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
    glow: 'glow-investigation'
  }
}

// Single Notification Component
function NotificationItem({ notification, onClose }) {
  const variant = notificationVariants[notification.type] || notificationVariants.info

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`cyber-card p-4 mb-3 border-l-4 ${variant.borderColor} ${variant.glow} relative overflow-hidden`}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent to-current opacity-30"
           style={{
             animation: `progressFill ${notification.duration}ms linear forwards`,
             '--progress-width': '100%'
           }}
      />

      <div className="flex items-start gap-3 relative z-10">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg ${variant.bgColor} ${variant.color} flex items-center justify-center text-lg font-bold flex-shrink-0`}>
          {variant.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {notification.title && (
            <h4 className="font-semibold text-sm mb-1 text-primary">{notification.title}</h4>
          )}
          <p className="text-sm text-secondary">{notification.message}</p>
          {notification.metadata && (
            <div className="mt-2 text-xs text-muted font-mono">
              {Object.entries(notification.metadata).map(([key, value]) => (
                <span key={key} className="mr-3">
                  {key}: <span className="text-tertiary">{value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onClose(notification.id)}
          className="text-muted hover:text-danger transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}

// Notification Container Component
export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore()

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Convenience functions for different notification types
export const notify = {
  success: (message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'success', message, ...options }),

  danger: (message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'danger', message, ...options }),

  warning: (message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'warning', message, ...options }),

  info: (message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'info', message, ...options }),

  investigation: (message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'investigation', message, ...options }),

  // Specialized notifications
  caseUpdate: (caseData) =>
    useNotificationStore.getState().addNotification({
      type: 'investigation',
      title: 'Case Updated',
      message: `Case ${caseData.caseId} status changed to ${caseData.status}`,
      metadata: {
        Priority: caseData.priority,
        'Risk Score': caseData.riskScore
      }
    }),

  systemAlert: (message) =>
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: 'System Alert',
      message,
      duration: 8000 // Longer duration for system alerts
    }),

  achievement: (title, message) =>
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      duration: 6000 // Longer duration for achievements
    })
}

// Hook for automatic notifications based on events
export function useEventNotifications() {
  useEffect(() => {
    // Simulate random system events for demo
    const eventInterval = setInterval(() => {
      const events = [
        () => notify.investigation('New suspicious activity detected in account MLACC00123'),
        () => notify.caseUpdate({
          caseId: 'MDE-24042',
          status: 'Under Review',
          priority: 'High',
          riskScore: '87.5'
        }),
        () => notify.info('Background ML model sync completed'),
        () => notify.success('Case MDE-24041 resolved successfully')
      ]

      // 10% chance every 30 seconds
      if (Math.random() < 0.1) {
        const randomEvent = events[Math.floor(Math.random() * events.length)]
        randomEvent()
      }
    }, 30000)

    return () => clearInterval(eventInterval)
  }, [])
}

// Real-time monitoring notification
export function MonitoringNotification({ isActive }) {
  useEffect(() => {
    if (!isActive) return

    const notify = useNotificationStore.getState().addNotification
    notify({
      type: 'info',
      title: 'Monitoring Active',
      message: 'Real-time threat monitoring is now active',
      duration: 3000
    })

    // Periodic monitoring updates
    const interval = setInterval(() => {
      const metrics = [
        'Scanned 1,247 transactions for anomalies',
        'Model confidence: 94.2%',
        '0 new critical alerts',
        'System load: 23%'
      ]

      notify({
        type: 'info',
        message: metrics[Math.floor(Math.random() * metrics.length)],
        duration: 2000
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [isActive])

  return null
}