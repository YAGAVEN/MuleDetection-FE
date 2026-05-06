import { useState } from 'react'
import Navbar from '../components/Layout/Navbar.jsx'
import NotificationToast, { notify } from '../components/shared/NotificationToast.jsx'
import MuleRiskPanel from '../components/Mule/MuleRiskPanel.jsx'
import MuleNetworkView from '../components/Mule/MuleNetworkView.jsx'
import { Icon } from '../components/Icons/IconSystem'

export default function MulePage() {
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [riskData, setRiskData] = useState(null)
  const [networkData, setNetworkData] = useState(null)
  const [layeringData, setLayeringData] = useState(null)
  const [sarGenerating, setSarGenerating] = useState(false)
  const [highRiskAccounts, setHighRiskAccounts] = useState([])
  const [highRiskLoading, setHighRiskLoading] = useState(false)
  const [demoAccounts, setDemoAccounts] = useState({ low: null, high: null })
  const [demoLoading, setDemoLoading] = useState(false)

  const runAccountAnalysis = async (targetAccountId) => {
    const account = targetAccountId.trim()
    if (!account) {
      notify('Please enter an Account ID', 'warning')
      return
    }

    setLoading(true)
    setRiskData(null)
    setNetworkData(null)
    setLayeringData(null)
    try {
      const api = (await import('../services/api.js')).default
      const [risk, network, layering] = await Promise.all([
        api.getMuleRisk(account),
        api.getNetworkMetrics(account),
        api.getLayeringDetection(account),
      ])
      setRiskData(risk)
      setNetworkData(network)
      setLayeringData(layering)
      setAccountId(account)
      notify(`Analysis complete for ${account}`, 'success')
    } catch (err) {
      notify(`Analysis failed: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const analyseAccount = async () => {
    await runAccountAnalysis(accountId)
  }

  const generateSAR = async () => {
    if (!riskData) { notify('Run an analysis first', 'warning'); return }
    setSarGenerating(true)
    try {
      const api = (await import('../services/api.js')).default
      await api.generateMuleSAR(accountId.trim(), riskData)
      notify('Mule SAR report generated!', 'success')
    } catch {
      notify('SAR generation failed', 'error')
    } finally {
      setSarGenerating(false)
    }
  }

  const loadHighRisk = async () => {
    setHighRiskLoading(true)
    try {
      const api = (await import('../services/api.js')).default
      const result = await api.getHighRiskAccounts(70)
      setHighRiskAccounts(result?.accounts ?? [])
      notify('High-risk accounts loaded', 'success')
    } catch {
      notify('Failed to load high-risk accounts', 'error')
    } finally {
      setHighRiskLoading(false)
    }
  }

  const selectHighRisk = (id) => {
    setAccountId(id)
    notify(`Account ${id} loaded – click Analyse to continue`, 'info')
  }

  const loadDemoAccountsFromData = async () => {
    setDemoLoading(true)
    try {
      const api = (await import('../services/api.js')).default
      const timeline = await api.getTimelineData('all', '1m')
      const transactions = timeline?.data ?? []

      if (!transactions.length) {
        notify('No timeline data available to build demo accounts', 'warning')
        return
      }

      const byAccount = new Map()
      transactions.forEach((tx) => {
        const score = Number(tx.suspicious_score) || 0
        const accounts = [tx.from_account, tx.to_account].filter(Boolean)

        accounts.forEach((id) => {
          const current = byAccount.get(id) || { sum: 0, count: 0 }
          current.sum += score
          current.count += 1
          byAccount.set(id, current)
        })
      })

      const ranked = Array.from(byAccount.entries())
        .map(([account_id, agg]) => ({
          account_id,
          avg_score: agg.count ? agg.sum / agg.count : 0,
          tx_count: agg.count,
        }))
        .filter((item) => item.tx_count > 0)

      if (ranked.length < 2) {
        notify('Insufficient account diversity in data for low/high demo', 'warning')
        return
      }

      const low = [...ranked].sort((a, b) => a.avg_score - b.avg_score)[0]
      const high = [...ranked].sort((a, b) => b.avg_score - a.avg_score)[0]

      setDemoAccounts({ low, high })
      notify('Low-risk and high-risk demo accounts ready', 'success')
    } catch {
      notify('Failed to derive demo accounts from data', 'error')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="text-white">
      <Navbar pageTitle="Mule Detection" pageIcon={<Icon name="Users" size={24} className="text-purple-400" />} pageTitleColor="text-purple-400" />
      <NotificationToast />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center animate-[glow_2s_ease-in-out_infinite_alternate]">
            <Icon name="Users" size={48} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Mule Detection Engine
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            AI-powered money mule profiling combining behavioural analysis, network graph intelligence,
            and layering pattern detection.
          </p>
        </div>

        {/* Search bar */}
        <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold mb-4 text-lg">Account Risk Analysis</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyseAccount()}
              placeholder="Enter Account ID (e.g. ACC_001)"
              className="flex-1 p-4 bg-black/30 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all"
            />
            <button
              onClick={analyseAccount}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center gap-2 justify-center"
            >
              <Icon name={loading ? "RefreshCw" : "Search"} size={20} className={loading ? "animate-spin" : ""} />
              <span>{loading ? 'Analysing…' : 'Analyse'}</span>
            </button>
            <button
              onClick={generateSAR}
              disabled={sarGenerating || !riskData}
              className="px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 justify-center"
            >
              <Icon name={sarGenerating ? "RefreshCw" : "FileText"} size={20} className={sarGenerating ? "animate-spin" : ""} />
              <span>{sarGenerating ? 'Generating…' : 'Generate SAR'}</span>
            </button>
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-[#00ff87] uppercase tracking-wide">
                Engine Verification From Data
              </h3>
              <button
                onClick={loadDemoAccountsFromData}
                disabled={demoLoading}
                className="px-4 py-2 bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 text-[#00d4ff] text-sm font-semibold rounded-xl transition-all disabled:opacity-40"
              >
                {demoLoading ? 'Loading Data…' : 'Load Low/High Samples'}
              </button>
            </div>

            {(demoAccounts.low || demoAccounts.high) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {demoAccounts.low && (
                  <button
                    onClick={() => runAccountAnalysis(demoAccounts.low.account_id)}
                    className="text-left p-4 bg-green-500/10 border border-green-400/30 hover:border-green-400/60 rounded-xl transition-all"
                  >
                    <div className="text-xs uppercase tracking-wide text-green-400 mb-1">Low Risk Sample</div>
                    <div className="text-white font-mono text-sm mb-1">{demoAccounts.low.account_id}</div>
                    <div className="text-xs text-gray-300">
                      Avg Suspicion: {(demoAccounts.low.avg_score * 100).toFixed(1)}% · Tx: {demoAccounts.low.tx_count}
                    </div>
                  </button>
                )}

                {demoAccounts.high && (
                  <button
                    onClick={() => runAccountAnalysis(demoAccounts.high.account_id)}
                    className="text-left p-4 bg-red-500/10 border border-red-400/30 hover:border-red-400/60 rounded-xl transition-all"
                  >
                    <div className="text-xs uppercase tracking-wide text-red-400 mb-1">High Risk Sample</div>
                    <div className="text-white font-mono text-sm mb-1">{demoAccounts.high.account_id}</div>
                    <div className="text-xs text-gray-300">
                      Avg Suspicion: {(demoAccounts.high.avg_score * 100).toFixed(1)}% · Tx: {demoAccounts.high.tx_count}
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Load samples to auto-pick one low-risk and one high-risk account from live timeline data.
              </p>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: risk panel */}
          <div className="lg:col-span-1">
            <MuleRiskPanel
              riskData={riskData}
              networkData={networkData}
              layeringData={layeringData}
              loading={loading}
            />
          </div>

          {/* Right: network graph + high risk */}
          <div className="lg:col-span-2 space-y-8">
            <MuleNetworkView
              accountId={accountId.trim() || 'TARGET'}
              networkData={riskData ? networkData : null}
            />

            {/* High-risk accounts panel */}
            <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">High-Risk Accounts</h3>
                <button
                  onClick={loadHighRisk}
                  disabled={highRiskLoading}
                  className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm rounded-xl transition-all disabled:opacity-40"
                >
                  {highRiskLoading ? 'Loading…' : '🚨 Load Top Risks'}
                </button>
              </div>

              {highRiskAccounts.length > 0 ? (
                <div className="space-y-2">
                  {highRiskAccounts.map((acc) => (
                    <div
                      key={acc.account_id}
                      onClick={() => selectHighRisk(acc.account_id)}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-all"
                    >
                      <span className="font-mono text-sm text-white">{acc.account_id}</span>
                      <span
                        className={`text-sm font-bold px-3 py-1 rounded-full ${
                          acc.risk_score >= 90
                            ? 'bg-red-500/20 text-red-400'
                            : acc.risk_score >= 70
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {Math.round(acc.risk_score)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  Click "Load Top Risks" to see accounts with risk score ≥ 70.
                </p>
              )}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: '🎯', label: 'Detection Method', value: 'ML + Graph' },
                { icon: '🔗', label: 'Analysis Engines', value: '4 Active' },
                { icon: '⚡', label: 'Risk Dimensions', value: 'Behavioural · Network · Layering · Velocity' },
                { icon: '📊', label: 'Compliance', value: 'AML / FinCEN' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="text-gray-400 text-xs mb-1">{label}</div>
                  <div className="text-white text-sm font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
