import { useEffect, useState } from 'react'

/**
 * App-level notification toast.
 * Usage: dispatch a CustomEvent 'trinetra:notify' with { detail: { message, type } }
 * types: 'success' | 'error' | 'warning' | 'info'
 */
export default function NotificationToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (e) => {
      const { message, type = 'info' } = e.detail
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
    }
    window.addEventListener('trinetra:notify', handler)
    return () => window.removeEventListener('trinetra:notify', handler)
  }, [])

  if (!toasts.length) return null

  const colorMap = {
    success: 'bg-[#00ff87] text-[#0a0a0f]',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-[#0a0a0f]',
    info: 'bg-[#00d4ff] text-[#0a0a0f]',
  }

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg text-sm font-semibold shadow-lg max-w-xs ${colorMap[t.type] ?? colorMap.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

/** Helper to fire a toast from anywhere */
export function notify(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('trinetra:notify', { detail: { message, type } }))
}
