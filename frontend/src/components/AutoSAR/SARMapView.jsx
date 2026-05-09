import { useEffect, useRef } from 'react'

/**
 * SARMapView – wraps the Leaflet-based initSarMap() service.
 */
export default function SARMapView() {
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    import('../../services/sar-map.js').then(({ initSarMap }) => {
      initSarMap().catch(console.error)
    })

    return () => {
      // Leaflet maps are cleaned up by clearing the container
      const el = document.getElementById('sar-map')
      if (el) el.innerHTML = ''
      mountedRef.current = false
    }
  }, [])

  return (
    <div
      id="sar-map"
      className="h-110 rounded-lg overflow-hidden"
      style={{ border: '2px solid #00ff87', boxShadow: '0 4px 20px rgba(0,255,135,0.2)' }}
    />
  )
}
