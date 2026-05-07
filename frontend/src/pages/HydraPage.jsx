import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Layout/Navbar.jsx'
import ProgressFlow from '../components/shared/ProgressFlow.jsx'
import NotificationToast, { notify } from '../components/shared/NotificationToast.jsx'
import { Icon } from '../components/Icons/IconSystem'
import BattleArenaView from '../components/Hydra/BattleArenaView.jsx'
import BattleMetrics from '../components/Hydra/BattleMetrics.jsx'

export default function HydraPage() {
  const navigate = useNavigate()
  const battleRef = useRef(null)

  const [battleActive, setBattleActive] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [battleAnalysis, setBattleAnalysis] = useState(null)
  const [metrics, setMetrics] = useState({
    defenderWins: 0,
    attackerWins: 0,
    totalBattles: 0,
    detectionRate: 0,
  })

  const startBattle = async () => {
    try {
      setBattleActive(true)
      await battleRef.current?.startBattle()
      updateMetrics()
      notify('AI Battle initiated successfully!', 'success')
    } catch {
      notify('Failed to start battle', 'error')
      setBattleActive(false)
    }
  }

  const stopBattle = () => {
    battleRef.current?.stopBattle()
    setBattleActive(false)
    updateMetrics()
    notify('AI Battle stopped', 'info')
  }

  const runSimulation = async () => {
    try {
      notify('Running simulation…', 'info')
      await battleRef.current?.runSimulation()
      updateMetrics()
      notify('Simulation complete!', 'success')
    } catch {
      notify('Simulation failed', 'error')
    }
  }

  const updateMetrics = () => {
    const raw = battleRef.current?.getMetrics?.()
    if (raw) {
      setMetrics({
        defenderWins: raw.defenderWins ?? 0,
        attackerWins: raw.attackerWins ?? 0,
        totalBattles: raw.totalBattles ?? 0,
        detectionRate: raw.detectionRate != null ? Math.round(raw.detectionRate * 100) : 0,
      })
    }
  }

  const exportResults = async () => {
    setExporting(true)
    try {
      const { default: PDFGenerator } = await import('../services/pdf-generator.js')
      const gen = new PDFGenerator()
      await gen.generateHydraPDF?.(metrics)
      notify('Results exported!', 'success')
    } catch {
      notify('Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  const getBattleInsights = async () => {
    setAnalysing(true)
    setBattleAnalysis(null)
    try {
      await delay(2500)
      setBattleAnalysis(generateMockInsights(metrics))
      notify('Battle analysis ready!', 'success')
    } catch {
      notify('Analysis failed', 'error')
    } finally {
      setAnalysing(false)
    }
  }

  const handleComplete = () => {
    navigate('/chronos')
  }

  return (
    <div className="text-white">
      <Navbar pageTitle="HYDRA" pageIcon={<Icon name="Shield" size={24} className="text-red-500" />} pageTitleColor="text-red-500" />
      <NotificationToast />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-purple-600 rounded-full flex items-center justify-center text-4xl animate-[battle_2s_ease-in-out_infinite]">
            <Icon name="Shield" size={48} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
            HYDRA AI Red-Team
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Advanced adversarial AI training system. Watch AI defenders battle against AI attackers to strengthen
            financial crime detection capabilities.
          </p>
          <ProgressFlow activeStep="hydra" />
        </div>

        {/* Battle Arena */}
        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-red-500/20">
          <h3 className="text-2xl font-semibold mb-6 text-red-500 text-center">⚔️ AI Battle Arena</h3>

          {/* How HYDRA Works */}
          <div className="bg-[#0a0a0f]/40 rounded-xl p-6 mb-8">
            <h4 className="text-lg font-semibold mb-4 text-[#00ff87]">🎯 How HYDRA Works</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              {[
                { icon: '🛡️', title: 'AI Defender', color: 'text-[#00d4ff]', desc: 'Protects against financial crime by detecting suspicious patterns using advanced ML algorithms.' },
                { icon: '⚔️', title: 'AI Attacker', color: 'text-red-400', desc: 'Generates sophisticated adversarial patterns to test and improve defense systems.' },
                { icon: '🧠', title: 'Battle Mode', color: 'text-purple-400', desc: 'Watch AI systems compete in real-time to improve detection through adversarial training.' },
              ].map(({ icon, title, color, desc }) => (
                <div key={title} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-2xl">
                    {icon}
                  </div>
                  <h5 className={`font-semibold ${color} mb-2`}>{title}</h5>
                  <p className="text-gray-300">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <button
              onClick={battleActive ? stopBattle : startBattle}
              className={`px-6 py-3 font-semibold rounded-lg text-white transition-all ${
                battleActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse'
              }`}
            >
              {battleActive ? '⏹️ Stop Battle' : '⚔️ Start Battle'}
            </button>
            <button
              onClick={runSimulation}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              🧪 Run Simulation
            </button>
            <button
              onClick={exportResults}
              disabled={exporting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : '📄 Export Results'}
            </button>
          </div>

          <BattleArenaView ref={battleRef} containerId="ai-battle" />
        </div>

        {/* Metrics + Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-8">
          <BattleMetrics metrics={metrics} />

          {/* AI Battle Intelligence */}
          <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 lg:col-span-2 xl:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-purple-500 flex items-center">
                🧠 AI Battle Intelligence
                <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                  Advanced Analytics
                </span>
              </h3>
              <button
                onClick={getBattleInsights}
                disabled={analysing}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50"
              >
                {analysing ? 'Analyzing…' : '📊 Analyze Performance'}
              </button>
            </div>

            <div id="ai-battle-analysis">
              {analysing && (
                <div className="text-center py-12 text-gray-400 animate-pulse">Running analysis…</div>
              )}
              {!analysing && !battleAnalysis && (
                <div className="text-center py-12 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl animate-pulse">
                    🧠
                  </div>
                  <h4 className="text-lg font-semibold text-purple-400 mb-2">AI Analysis Ready</h4>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Run battles or simulations to unlock advanced AI-powered insights about your defence system.
                  </p>
                </div>
              )}
              {battleAnalysis && (
                <div
                  className="text-gray-300 space-y-4"
                  dangerouslySetInnerHTML={{ __html: battleAnalysis }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/autosar')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Back to Auto-SAR
          </button>
          <button
            onClick={handleComplete}
            className="px-8 py-3 bg-gradient-to-r from-[#00ff87] to-[#00d4ff] text-[#0a0a0f] font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
          >
            Complete Analysis →
          </button>
        </div>
      </main>
    </div>
  )
}

/* ── Helpers ── */
function generateMockInsights(metrics) {
  const rate = metrics.detectionRate
  return `
    <div class="space-y-4">
      <div class="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
        <h5 class="text-purple-400 font-semibold mb-2">🎯 Performance Summary</h5>
        <p>Defender win rate: <strong class="text-[#00d4ff]">${metrics.defenderWins}</strong> / ${metrics.totalBattles} battles &nbsp;|&nbsp; Detection rate: <strong class="text-[#00ff87]">${rate}%</strong></p>
      </div>
      <div class="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
        <h5 class="text-red-400 font-semibold mb-2">⚔️ Attack Analysis</h5>
        <p>Attacker wins: <strong class="text-red-400">${metrics.attackerWins}</strong>. Adversarial patterns leveraged structuring & rapid-sequence layering techniques.</p>
      </div>
      <div class="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
        <h5 class="text-green-400 font-semibold mb-2">✅ Recommendations</h5>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Retrain detection model with newly identified adversarial patterns</li>
          <li>Increase threshold sensitivity for sub-$10 000 structured transactions</li>
          <li>Deploy updated model to production monitoring pipeline</li>
        </ul>
      </div>
    </div>
  `
}
