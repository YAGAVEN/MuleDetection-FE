import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Layout/Navbar.jsx'
import ProgressFlow from '../components/shared/ProgressFlow.jsx'
import NotificationToast, { notify } from '../components/shared/NotificationToast.jsx'
import { Icon } from '../components/Icons/IconSystem'
import TimelineView from '../components/Chronos/TimelineView.jsx'
import PlaybackControls from '../components/Chronos/PlaybackControls.jsx'
import AIInsightsPanel from '../components/Chronos/AIInsightsPanel.jsx'
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

  const handleGenerateInsights = async () => {
    setInsightsLoading(true)
    try {
      const { default: geminiAPI } = await import('../services/gemini-api.js')
      const api = (await import('../services/api.js')).default
      const data = await api.getTimelineData('all', '1m')
      const transactions = data?.data ?? []

      // Build analysis data from transactions
      const suspiciousCount = transactions.filter(t => (t.suspicious_score || 0) > 0.5).length
      const totalAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0)
      const patterns = [...new Set(transactions.map(t => t.pattern_type).filter(Boolean))]
      const analysisData = {
        totalTransactions: transactions.length,
        suspiciousCount,
        totalAmount,
        patterns
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
          
          <div class="bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-lg p-4">
            <div class="text-xs uppercase tracking-wide text-[#FFB800] mb-2">Risk Assessment</div>
            <div class="flex items-center justify-between">
              <span class="text-xl font-bold text-white">${result?.riskAssessment || 'MEDIUM'}</span>
              <span class="text-sm text-gray-400">Confidence: ${result?.confidence || 80}%</span>
            </div>
          </div>
          
          ${result?.techniques || patterns.length > 0 ? `
            <div class="bg-[#20B2AA]/10 border border-[#20B2AA]/30 rounded-lg p-4">
              <div class="text-xs uppercase tracking-wide text-[#20B2AA] mb-2">Detection Techniques</div>
              <div class="text-sm text-gray-300">${(result?.techniques || patterns).join(' • ')}</div>
            </div>
          ` : ''}
          
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

      const response = await fetch('http://localhost:5001/api/import/csv', {
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

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/import/template')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transaction_import_template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      notify('Template downloaded', 'success')
    } catch (error) {
      notify('Failed to download template', 'error')
    }
  }

  return (
    <div className="text-white">
      <Navbar pageTitle="CHRONOS" pageIcon={<Icon name="Clock" size={24} className="text-[#00ff87]" />} pageTitleColor="text-[#00ff87]" />
      <NotificationToast />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#00ff87] to-[#00d4ff] rounded-full flex items-center justify-center text-4xl animate-[glow_2s_ease-in-out_infinite_alternate]">
            <Icon name="Clock" size={48} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#00ff87] to-[#00d4ff] bg-clip-text text-transparent">
            CHRONOS Timeline
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Visualize financial crime patterns through time. Analyze transaction flows, detect suspicious activities,
            and uncover hidden connections in real-time.
          </p>
          <ProgressFlow activeStep="chronos" />
        </div>

        {/* Controls */}
        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 mb-8 border-2 border-[#00CED1]/20">
          <h3 className="text-2xl font-semibold mb-6 text-[#00CED1] uppercase tracking-wide">Analysis Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

            {/* Time Quantum */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300 uppercase tracking-wide">Time Period</label>
              <select
                onChange={handleTimeQuantumChange}
                className="w-full bg-[#0a0a0f]/80 border-2 border-[#00CED1]/30 rounded-lg px-3 py-2 text-white focus:border-[#00CED1] focus:ring-1 focus:ring-[#00CED1] transition-all"
              >
                <option value="1m">1 Month</option>
                <option value="6m">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="3y">3 Years</option>
              </select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Search Transactions</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter account ID or transaction pattern..."
                  className="flex-1 bg-[#0a0a0f]/80 border-2 border-[#00CED1]/30 rounded-lg px-3 py-2 text-white focus:border-[#00CED1] focus:ring-1 focus:ring-[#00CED1] transition-all"
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-[#00CED1] hover:bg-[#00CED1]/80 text-[#0a0a0f] font-semibold rounded-lg transition-all uppercase tracking-wide"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Playback */}
            <PlaybackControls
              speed={speed}
              onSpeedChange={handleSpeedChange}
              onPlay={() => timelineRef.current?.play()}
              onPause={() => timelineRef.current?.pause()}
              onReset={() => timelineRef.current?.reset()}
            />

            {/* View Mode */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Visualization Mode</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewSwitch('timeline')}
                  className={`flex-1 px-3 py-2 rounded-lg transition-all uppercase text-sm font-semibold tracking-wide ${viewMode === 'timeline' ? 'bg-[#00CED1] text-[#0a0a0f]' : 'bg-[#0a0a0f]/80 text-gray-300 border-2 border-[#00CED1]/30 hover:border-[#00CED1]/60'}`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => handleViewSwitch('network')}
                  className={`flex-1 px-3 py-2 rounded-lg transition-all uppercase text-sm font-semibold tracking-wide ${viewMode === 'network' ? 'bg-[#00CED1] text-[#0a0a0f]' : 'bg-[#0a0a0f]/80 text-gray-300 border-2 border-[#00CED1]/30 hover:border-[#00CED1]/60'}`}
                >
                  Network
                </button>
              </div>
            </div>

            {/* Export */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Export Results</label>
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-[#20B2AA] hover:bg-[#20B2AA]/80 text-white rounded-lg transition-all uppercase text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
              >
                <Icon name="Download" size={16} />
                <span>Export Report</span>
              </button>
            </div>

            {/* Import */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Import Data</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className="flex-1 px-4 py-2 bg-[#00ff87] hover:bg-[#00ff87]/80 text-[#0a0a0f] rounded-lg transition-all uppercase text-sm font-semibold tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name={importing ? "RefreshCw" : "Upload"} size={16} className={importing ? "animate-spin" : ""} />
                  <span>{importing ? 'Importing...' : 'Import CSV'}</span>
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  title="Download CSV Template"
                  className="px-3 py-2 bg-[#0a0a0f]/80 hover:bg-[#0a0a0f] border-2 border-[#00CED1]/30 hover:border-[#00CED1]/60 text-white rounded-lg transition-all"
                >
                  <Icon name="FileText" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'network' && (
          <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-[#00CED1]/20">
            <div className="flex flex-wrap gap-3">
              {[
                {
                  key: 'all',
                  label: 'All Transactions',
                  activeClass: 'bg-white/20 text-white border-white/40',
                  idleClass: 'bg-[#0a0a0f]/80 text-gray-300 border-white/20 hover:border-white/50 hover:text-white',
                },
                {
                  key: 'low',
                  label: 'Low Risk',
                  activeClass: 'bg-[#00CED1]/20 text-[#00CED1] border-[#00CED1]/60',
                  idleClass: 'bg-[#0a0a0f]/80 text-gray-300 border-[#00CED1]/30 hover:border-[#00CED1]/60 hover:text-[#00CED1]',
                },
                {
                  key: 'high',
                  label: 'High Risk',
                  activeClass: 'bg-[#FF3333]/20 text-[#FF3333] border-[#FF3333]/60',
                  idleClass: 'bg-[#0a0a0f]/80 text-gray-300 border-[#FF3333]/30 hover:border-[#FF3333]/60 hover:text-[#FF3333]',
                },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNetworkFilter(item.key)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all uppercase text-sm tracking-wide font-semibold ${networkFilter === item.key
                    ? item.activeClass
                    : item.idleClass}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Visualization */}
        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 mb-8 border-2 border-[#00CED1]/20">
          <TimelineView ref={timelineRef} containerId="chronos-timeline" />
          <div id="timeline-info" className="mt-6 p-6 bg-[#0a0a0f]/40 rounded-lg border border-[#00CED1]/10" />
        </div>

        {/* AI Insights */}
        <AIInsightsPanel
          insights={insights}
          loading={insightsLoading}
          onGenerate={handleGenerateInsights}
        />

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all uppercase text-sm font-semibold tracking-wide"
          >
            ← Previous
          </button>
          <button
            onClick={() => navigate('/autosar')}
            className="px-8 py-3 bg-gradient-to-r from-[#00CED1] to-[#20B2AA] text-[#0a0a0f] font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all uppercase tracking-wide"
          >
            Continue to Auto-SAR →
          </button>
        </div>
      </main>
    </div>
  )
}

function generateFallbackInsight(transactions) {
  const total = transactions.length
  const high = transactions.filter((t) => t.suspicious_score > 0.8).length
  return `
    <div class="space-y-2 text-gray-300">
      <p class="flex items-center gap-2"><span class="text-[#00CED1] font-semibold">■</span> <strong class="text-[#00CED1]">${total}</strong> transactions analyzed</p>
      <p class="flex items-center gap-2"><span class="text-[#FF3333] font-semibold">▲</span> <strong class="text-[#FF3333]">${high}</strong> high-risk patterns detected</p>
      <p class="flex items-center gap-2"><span class="text-[#FFB800] font-semibold">▸</span> Structuring and layering behavior observed across multiple accounts</p>
    </div>
  `
}
