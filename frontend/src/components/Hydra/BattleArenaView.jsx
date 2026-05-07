import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

/**
 * BattleArenaView wraps the EnhancedHydraAI class from the services layer.
 */
const BattleArenaView = forwardRef(function BattleArenaView({ containerId = 'ai-battle' }, ref) {
  const instanceRef = useRef(null)

  useEffect(() => {
    import('../../services/hydra-enhanced.js').then(({ default: EnhancedHydraAI }) => {
      instanceRef.current = new EnhancedHydraAI()
    })

    return () => {
      instanceRef.current?.stopBattle?.()
      instanceRef.current = null
      const el = document.getElementById(containerId)
      if (el) el.innerHTML = ''
    }
  }, [containerId])

  useImperativeHandle(ref, () => ({
    startBattle: () => instanceRef.current?.startBattle(),
    stopBattle: () => instanceRef.current?.stopBattle(),
    runSimulation: () => instanceRef.current?.runSimulation?.(),
    getMetrics: () => instanceRef.current?.getMetrics?.() ?? null,
  }))

  return (
    <div
      id={containerId}
      className="min-h-[400px] bg-[#0a0a0f]/20 rounded-xl p-6"
    />
  )
})

export default BattleArenaView
