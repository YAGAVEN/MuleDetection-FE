import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Layout/Navbar.jsx'
import ProgressFlow from '../components/shared/ProgressFlow.jsx'
import NotificationToast, { notify } from '../components/shared/NotificationToast.jsx'
import { Icon } from '../components/Icons/IconSystem'
import TimelineView from '../components/Chronos/TimelineView.jsx'
import PlaybackControls from '../components/Chronos/PlaybackControls.jsx'
import AIInsightsPanel from '../components/Chronos/AIInsightsPanel.jsx'
import RiskScoringPanel from '../components/Chronos/RiskScoringPanel.jsx'
import SHAPModelReportPanel from '../components/Chronos/SHAPModelReportPanel.jsx'
import { TimelineIcon } from '../components/Icons'

export default function ChronosPage() {
  const navigate = useNavigate()
  const timelineRef = useRef(null)

  const [speed, setSpeed] = useState(1)
  const [viewMode, setViewMode] = useState('timeline')
  const [networkFilter, setNetworkFilter] = useState('all')
  const [insights, setInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [importing, setImporting] = useState(false)
  const [riskScores, setRiskScores] = useState([])
  const [pipelineStatus, setPipelineStatus] = useState(null)
  const fileInputRef = useRef(null)

  /* ── Handlers ── */
  const handleTimeQuantumChange = async (e) => {
    await timelineRef.current?.setTimeQuantum(e.target.value)
  }

  const handleSpeedChange = (val) => {
    setSpeed(val)
    timelineRef.current?.setPlaybackSpeed(val)
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    try {
      const results = await timelineRef.current?.searchTransactions(searchTerm, 'all')
      if (results) notify(`Found ${results.length} results`, 'success')
    } catch {
      notify('Search failed', 'error')
    }
  }

  const handleViewSwitch = (mode) => {
    setViewMode(mode)
    timelineRef.current?.switchView(mode)
  }

  const handleNetworkFilter = (filter) => {
    setNetworkFilter(filter)
    timelineRef.current?.setNetworkRiskFilter(filter)
  }

  const handleRiskScoresLoaded = (scores) => {
    setRiskScores(scores)
    // Pass risk scores to timeline visualization
    timelineRef.current?.updateRiskScores(scores)
    notify(`Risk scoring enabled for ${scores.length} accounts`, 'success')
  }

  const handlePipelineStatusChange = (status) => {
    setPipelineStatus(status)
  }

  const handleGenerateInsights = async () => {
    setInsightsLoading(true)
    try {
      const { default: geminiAPI } = await import('../services/gemini-api.js')
      const api = (await import('../services/api.js')).default
      const data = await api.getTimelineData('all', '1m')
      const transactions = data?.data ?? []

      // Build analysis data from transactions, enhanced with risk scores
      const suspiciousCount = transactions.filter(t => (t.suspicious_score || 0) > 0.5).length
      const totalAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0)
      const patterns = [...new Set(transactions.map(t => t.pattern_type).filter(Boolean))]
      
      // Include risk score statistics if available
      const highRiskAccounts = riskScores.filter(acc => acc.risk_level === 'CRITICAL' || acc.risk_level === 'HIGH')
      
      const analysisData = {
        totalTransactions: transactions.length,
        suspiciousCount,
        totalAmount,
        patterns,
        riskScoredAccounts: riskScores.length,
        highRiskCount: highRiskAccounts.length
      }

      const result = await geminiAPI.enhanceFinancialAnalysis(analysisData)

      // Format the result as professional HTML cards (NO EMOJIS)
      const insightHtml = `
        <div class="space-y-6 text-gray-300">
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-[#00CED1]/10 border border-[#00CED1]/30 rounded-lg p-4">
              <div class="text-xs uppercase tracking-wide text-[#00CED1] mb-1">Transactions Analyzed</div>
              <div class="text-3xl font-bold text-white">${transactions.length}</div>
            </div>
            <div class="bg-[#FF3333]/10 border border-[#FF3333]/30 rounded-lg p-4">
              <div class="text-xs uppercase tracking-wide text-[#FF3333] mb-1">Suspicious Patterns</div>
              <div class="text-3xl font-bold text-white">${suspiciousCount} <span class="text-sm text-gray-400">(${((suspiciousCount/transactions.length)*100).toFixed(1)}%)</span></div>
            </div>
          </div>
          
          <div class="bg-[#00CED1]/10 border border-[#00CED1]/30 rounded-lg p-4">
            <div class="text-xs uppercase tracking-wide text-[#00CED1] mb-2">Total Exposure</div>
            <div class="text-2xl font-bold text-white">₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>

          ${riskScores.length > 0 ? `
            <div class="bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-lg p-4">
              <div class="text-xs uppercase tracking-wide text-[#FFB800] mb-2">GNN Risk Scores</div>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="flex items-center">
                  <span class="text-white font-bold">${highRiskAccounts.length}</span>
                  <span class="text-gray-400 ml-2">High Risk Accounts</span>
                </div>
                <div class="flex items-center">
                  <span class="text-white font-bold">${riskScores.length}</span>
                  <span class="text-gray-400 ml-2">Total Scored</span>
                </div>
              </div>
            </div>
          ` : ''}
          
          <div class="bg-[#20B2AA]/10 border border-[#20B2AA]/30 rounded-lg p-4">
            <div class="text-xs uppercase tracking-wide text-[#20B2AA] mb-2">Detection Techniques</div>
            <div class="text-sm text-gray-300">${(result?.techniques || patterns).join(' • ')}</div>
          </div>
          
          ${result?.enhancedInsights ? `
            <div class="bg-white/5 border border-white/10 rounded-lg p-4">
              <div class="text-xs uppercase tracking-wide text-gray-400 mb-2">Analysis Summary</div>
              <p class="text-sm text-gray-300">${result.enhancedInsights}</p>
            </div>
          ` : ''}
          
          ${result?.recommendations ? `
            <div class="bg-[#00CED1]/10 border border-[#00CED1]/30 rounded-lg p-4">
              <div class="text-xs uppercase tracking-wide text-[#00CED1] mb-3">Recommendations</div>
              <ul class="space-y-2">
                ${result.recommendations.map(r => `<li class="text-sm text-gray-300 flex items-start"><span class="text-[#00CED1] mr-2">▸</span><span>${r}</span></li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `
      setInsights([insightHtml])
    } catch (error) {
      // Check if this is a backend connection error
      const isBackendError = error?.message?.includes('Failed to fetch') || 
                             error?.message?.includes('fetch') ||
                             error?.response?.status === 0;
      
      if (isBackendError) {
        setInsights([`
          <div class="bg-[#FF3333]/10 border border-[#FF3333]/30 rounded-lg p-6">
            <div class="text-[#FF3333] font-semibold mb-2">Backend Unavailable</div>
            <p class="text-sm text-gray-300">Start FastAPI server on port 8000</p>
            <p class="text-xs text-gray-500 mt-2">cd backend && uvicorn app.main:app --reload --port 8000</p>
          </div>
        `])
      } else {
        setInsights([`
          <div class="bg-white/5 border border-white/10 rounded-lg p-6">
            <div class="text-gray-400 font-semibold mb-2">Analysis Unavailable</div>
            <p class="text-sm text-gray-500">Unable to generate insights at this time.</p>
          </div>
        `])
      }
    } finally {
      setInsightsLoading(false)
    }
  }

  const handleExport = () => {
    timelineRef.current?.exportReport()
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      notify('Please upload a CSV file', 'error')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:8000/api/ingestion/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        notify(`✅ Imported ${data.inserted} transactions successfully!`, 'success')
        // Refresh timeline
        timelineRef.current?.refresh?.()
      } else {
        const errorMsg = data.errors ? data.errors.join(', ') : data.message
        notify(`Import failed: ${errorMsg}`, 'error')
      }
    } catch (error) {
      notify('Failed to upload file. Please try again.', 'error')
      console.error('[ERROR] Import failed:', error)
    } finally {
      setImporting(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f1729] to-[#1a0033]">
      <Navbar />
      <ProgressFlow />
      <NotificationToast />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <TimelineIcon size={32} className="text-[#00ff87]" />
            <h1 className="text-4xl font-bold text-white">Chronos Timeline</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Real-time transaction analysis with GNN-powered risk scoring
          </p>
        </div>

        {/* Risk Scoring Pipeline */}
        <RiskScoringPanel 
          onRiskScoresLoaded={handleRiskScoresLoaded}
          onPipelineStatusChange={handlePipelineStatusChange}
          loading={importing}
          pipelineStatus={pipelineStatus}
        />

        {/* SHAP Model Report - Suspicious Accounts Analysis */}
        <SHAPModelReportPanel 
          pipelineStatus={pipelineStatus}
          onReportLoaded={(data) => notify(`SHAP analysis ready for ${data.total_suspicious} accounts`, 'success')}
        />

        {/* Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Playback Controls */}
          <div>
            <PlaybackControls
              speed={speed}
              onSpeedChange={handleSpeedChange}
              onPlay={() => timelineRef.current?.play?.()}
              onPause={() => timelineRef.current?.pause?.()}
              onReset={() => timelineRef.current?.reset?.()}
            />
          </div>

          {/* View Mode */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">View Mode</label>
            <div className="space-y-2">
              <button
                onClick={() => handleViewSwitch('timeline')}
                className={`w-full px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-[#00ff87] text-black font-bold'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => handleViewSwitch('network')}
                className={`w-full px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'network'
                    ? 'bg-[#00ff87] text-black font-bold'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Network
              </button>
            </div>
          </div>

          {/* Network Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Risk Filter</label>
            <select
              value={networkFilter}
              onChange={(e) => handleNetworkFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none"
            >
              <option value="all">All Accounts</option>
              <option value="low">Low Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Actions</label>
            <button
              onClick={handleExport}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Export
            </button>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="mb-8">
          <TimelineView ref={timelineRef} riskScores={riskScores} />
        </div>

        {/* AI Insights */}
        <AIInsightsPanel
          insights={insights}
          loading={insightsLoading}
          onGenerate={handleGenerateInsights}
        />
      </div>
    </div>
  )
}
