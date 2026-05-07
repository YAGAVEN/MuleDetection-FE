import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

/**
 * TimelineView wraps the existing D3-based ChronosTimeline class.
 * The parent page passes a ref to call methods like play(), pause(), reset(), etc.
 */
const TimelineView = forwardRef(function TimelineView({ containerId = 'chronos-timeline' }, ref) {
  const instanceRef = useRef(null)

  useEffect(() => {
    let instance = null
    // Lazy-import to avoid SSR issues and ensure DOM is ready
    import('../../services/chronos.js').then(({ default: ChronosTimeline }) => {
      instance = new ChronosTimeline(containerId)
      instanceRef.current = instance
      instance.loadData('all').catch(console.error)
    })

    return () => {
      // D3 cleanup: remove all SVG/DOM nodes inside the container
      const el = document.getElementById(containerId)
      if (el) el.innerHTML = ''
      instanceRef.current = null
    }
  }, [containerId])

  // Expose timeline methods to the parent page via ref
  useImperativeHandle(ref, () => ({
    loadData: (scenario) => instanceRef.current?.loadData(scenario),
    setTimeQuantum: (q) => instanceRef.current?.setTimeQuantum(q),
    play: () => instanceRef.current?.play(),
    pause: () => instanceRef.current?.pause(),
    reset: () => instanceRef.current?.reset(),
    setPlaybackSpeed: (s) => instanceRef.current?.setPlaybackSpeed?.(s),
    searchTransactions: (term, type) => instanceRef.current?.searchTransactions(term, type),
    switchView: (mode) => instanceRef.current?.switchView?.(mode),
    setNetworkRiskFilter: (filter) => instanceRef.current?.setNetworkRiskFilter?.(filter),
    exportReport: () => instanceRef.current?.exportReport?.(),
  }))

  return <div id={containerId} className="min-h-[600px] w-full" />
})

export default TimelineView
