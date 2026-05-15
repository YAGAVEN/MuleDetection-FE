import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Layout/Navbar.jsx'
import ProgressFlow from '../components/shared/ProgressFlow.jsx'
import NotificationToast, { notify } from '../components/shared/NotificationToast.jsx'
import { Icon } from '../components/Icons/IconSystem'
import SARMapView from '../components/AutoSAR/SARMapView.jsx'
import SHAPExplainer from '../components/AutoSAR/SHAPExplainer.jsx'

export default function AutoSARPage() {
  const navigate = useNavigate()
  const autoSarRef = useRef(null)
  const [activeTab, setActiveTab] = useState('sar') // 'sar' or 'shap'

  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [mlResults, setMlResults] = useState([])
  const [sarReport, setSarReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState(null)
  const [exporting, setExporting] = useState(false)

  const performAIAnalysis = async () => {
    setAnalysisRunning(true)
    setMlResults([])
    try {
      const api = (await import('../services/api.js')).default
      const data = await api.getTimelineData('all', '1m')
      const transactions = data?.data ?? []

      // Compute real detection scores from transaction data
      const total = transactions.length
      const structuring = transactions.filter(t => (t.pattern_type === 'structuring' || t.amount < 10000) && t.suspicious_score > 0.5)
      const layering = transactions.filter(t => t.pattern_type === 'layering' || t.pattern_type === 'rapid_sequence')
      const crossBorder = transactions.filter(t => t.aadhar_location && t.aadhar_location.country !== 'India')
      const shellActivity = transactions.filter(t => t.from_account?.includes('SHELL') || t.to_account?.includes('SHELL'))

      const pct = (arr) => total > 0 ? ((arr.length / total) * 100).toFixed(1) : '0.0'

      const detections = [
        { label: '🚨 Structuring Detection', score: `${pct(structuring)}%`, desc: `${structuring.length} transactions below ₹10,000 threshold with elevated suspicion`, from: 'red-500', border: 'red-500' },
        { label: '💰 Layering Scheme', score: `${pct(layering)}%`, desc: `${layering.length} rapid-sequence or layering pattern transactions detected`, from: 'yellow-500', border: 'yellow-500' },
        { label: '🌐 Cross-Border Transfers', score: `${pct(crossBorder)}%`, desc: `${crossBorder.length} international transfers to ${[...new Set(crossBorder.map(t => t.aadhar_location?.country).filter(Boolean))].join(', ') || 'N/A'}`, from: 'purple-500', border: 'purple-500' },
        { label: '🏢 Shell Company Activity', score: `${pct(shellActivity)}%`, desc: `${shellActivity.length} transactions involving shell accounts`, from: 'blue-500', border: 'blue-500' },
      ]

      // Simulate progressive loading
      for (let i = 0; i < detections.length; i++) {
        await delay(600)
        setMlResults(prev => [...prev, detections[i]])
      }

      notify(`AI analysis completed – ${total} transactions scanned`, 'success')
    } catch {
      notify('AI analysis failed', 'error')
    } finally {
      setAnalysisRunning(false)
    }
  }

  const generateSARReport = async () => {
    setGenerating(true)
    try {
      const api = (await import('../services/api.js')).default
      const result = await api.generateSARReport({ scenario: 'all' })
      setSarReport(result?.sar_report ?? null)
      setValidationResults(null)
      notify('SAR report generated!', 'success')
    } catch {
      notify('Failed to generate SAR report', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const validateReport = async () => {
    if (!sarReport) { notify('Generate a report first', 'warning'); return }
    setValidating(true)
    await delay(800)

    const checks = [
      { field: 'Report ID', ok: !!sarReport.report_id },
      { field: 'Priority', ok: !!sarReport.priority },
      { field: 'Risk Level', ok: !!sarReport.risk_level },
      { field: 'Summary', ok: !!sarReport.summary },
      { field: 'Confidence Score', ok: typeof sarReport.confidence_score === 'number' },
      { field: 'Evidence / Risk Factors', ok: sarReport.evidence?.risk_factors?.length > 0 },
      { field: 'Regulatory Codes', ok: sarReport.regulatory_compliance?.codes?.length > 0 },
      { field: 'Filing Deadline', ok: !!sarReport.regulatory_compliance?.filing_deadline },
      { field: 'Recommendations', ok: sarReport.recommendations?.length > 0 },
      { field: 'Accounts Involved', ok: sarReport.details?.accounts_involved?.length > 0 },
    ]
    const passed = checks.filter(c => c.ok).length
    setValidationResults(checks)

    if (passed === checks.length) {
      notify(`Validation passed – all ${passed} required fields complete ✅`, 'success')
    } else {
      notify(`Validation: ${passed}/${checks.length} fields complete`, 'warning')
    }
    setValidating(false)
  }

  const exportPDF = async () => {
    if (!sarReport) { notify('Generate a report first', 'warning'); return }
    setExporting(true)
    try {
      const { default: PDFGenerator } = await import('../services/pdf-generator.js')
      const gen = new PDFGenerator()
      await gen.generateSARReport(sarReport)
      const filename = `SAR_${sarReport.report_id || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`
      await gen.downloadPDF(filename)
      notify('PDF exported!', 'success')
    } catch (err) {
      console.error('PDF export error:', err)
      notify('PDF export failed – check console', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="text-white">
      <Navbar pageTitle="Auto-SAR" pageIcon={<Icon name="FileText" size={24} className="text-[#00ff87]" />} pageTitleColor="text-[#00ff87]" />
      <NotificationToast />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-4xl animate-[glow_2s_ease-in-out_infinite_alternate]">
            <Icon name="Zap" size={48} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            AUTOSAR
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Advanced AI-powered Suspicious Activity Reports and SHAP Model Explainability. Detect financial crimes and understand model predictions with full transparency.
          </p>
          <ProgressFlow activeStep="autosar" />
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => setActiveTab('sar')}
            className={`px-8 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'sar'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:text-white border border-gray-600/50'
            }`}
          >
            📋 SAR Reports
          </button>
          <button
            onClick={() => setActiveTab('shap')}
            className={`px-8 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'shap'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:text-white border border-gray-600/50'
            }`}
          >
            🔬 SHAP Analysis
          </button>
        </div>

        {/* SAR Section */}
        {activeTab === 'sar' && (
          <>
            {/* Controls + ML Results */}
            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-8 mb-8">
              {/* AI Analysis Panel */}
              <div className="lg:col-span-1">
                <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold mb-4 text-orange-500">🤖 AI Analysis</h3>
                  <div className="space-y-4">
                    <button
                      onClick={performAIAnalysis}
                      disabled={analysisRunning}
                      className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {analysisRunning ? 'Analyzing...' : 'Start AI Analysis'}
                    </button>
                    <button
                      onClick={generateSARReport}
                      disabled={generating}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Generate SAR Report'}
                    </button>
                    <button
                      onClick={validateReport}
                      disabled={validating}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {validating ? 'Validating...' : '⚖️ Validate Report'}
                    </button>
                    <button
                      onClick={exportPDF}
                      disabled={exporting}
                      className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {exporting ? 'Exporting...' : '📄 Export PDF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ML Results */}
              <div className="lg:col-span-3 xl:col-span-4">
                <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/20">
                  <h3 className="text-xl font-semibold mb-4 text-orange-500">🧠 ML Detection Results</h3>
                  <div className="space-y-4">
                    {analysisRunning && mlResults.length === 0 && (
                      <div className="text-center py-8 animate-pulse text-gray-400">
                        Running AI analysis on transaction data…
                      </div>
                    )}
                    {!analysisRunning && mlResults.length === 0 && (
                      <div className="text-gray-400 text-center py-8">
                        Click "Start AI Analysis" to begin detection…
                      </div>
                    )}
                    {mlResults.map((item) => (
                      <MLResultCard key={item.label} {...item} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Results */}
            {validationResults && (
              <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-blue-500/20">
                <h3 className="text-xl font-semibold mb-4 text-blue-400">⚖️ Validation Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {validationResults.map((check) => (
                    <div key={check.field} className={`rounded-lg p-3 text-center text-sm border ${check.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                      <div className="text-lg mb-1">{check.ok ? '✅' : '❌'}</div>
                      {check.field}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SAR Report */}
            <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-orange-500/20">
              <h3 className="text-xl font-semibold mb-4 text-orange-500">📄 SAR Report</h3>
              <div className="min-h-[400px]">
                {sarReport ? <SARReportDisplay report={sarReport} /> : (
                  <div className="text-gray-400 text-center py-16">
                    SAR report will appear here after generation…
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-orange-500/20">
              <h3 className="text-xl font-semibold mb-4 text-orange-500">🗺️ Geographic Risk Assessment</h3>
              <SARMapView />
            </div>
          </>
        )}

        {/* SHAP Analysis Section */}
        {activeTab === 'shap' && (
          <SHAPExplainer />
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/chronos')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Back to CHRONOS
          </button>
          <button
            onClick={() => navigate('/hydra')}
            className="px-8 py-3 bg-gradient-to-r from-[#00ff87] to-[#00d4ff] text-[#0a0a0f] font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
          >
            Proceed to HYDRA →
          </button>
        </div>
      </main>
    </div>
  )
}

/* ── Sub-components ── */
function MLResultCard({ label, score, desc, from }) {
  const colorMap = {
    'red-500': { bg: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30', text: 'text-red-400' },
    'yellow-500': { bg: 'from-yellow-500/20 to-orange-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    'purple-500': { bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
    'blue-500': { bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  }
  const c = colorMap[from] ?? colorMap['blue-500']
  return (
    <div className={`bg-gradient-to-r ${c.bg} rounded-lg p-4 border ${c.border}`}>
      <div className="flex justify-between items-center mb-2">
        <h5 className={`${c.text} font-semibold`}>{label}</h5>
        <span className={`${c.text} font-bold`}>{score}</span>
      </div>
      <p className="text-sm text-gray-300">{desc}</p>
    </div>
  )
}

function SARReportDisplay({ report }) {
  if (!report) return null
  return (
    <div className="space-y-4 text-sm text-gray-300">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Report ID" value={report.report_id} />
        <InfoCard label="Priority" value={report.priority} color={report.priority === 'HIGH' ? 'text-red-400' : report.priority === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'} />
        <InfoCard label="Risk Level" value={report.risk_level} color={report.risk_level === 'HIGH' ? 'text-red-400' : report.risk_level === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'} />
        <InfoCard
          label="Confidence"
          value={report.confidence_score ? `${(report.confidence_score * 100).toFixed(1)}%` : 'N/A'}
          color="text-[#00d4ff]"
        />
      </div>

      {/* Summary */}
      <div className="bg-[#0a0a0f]/40 rounded-xl p-6">
        <h4 className="text-orange-400 font-semibold mb-2">📝 Executive Summary</h4>
        <p>{report.summary}</p>
      </div>

      {/* Pattern Details */}
      {report.details && (
        <div className="bg-[#0a0a0f]/40 rounded-xl p-6">
          <h4 className="text-[#00d4ff] font-semibold mb-3">📊 Pattern Analysis</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MiniStat label="Pattern Type" value={report.details.pattern_type} />
            <MiniStat label="Total Transactions" value={report.details.total_transactions} />
            <MiniStat label="Suspicious" value={report.details.suspicious_transactions} />
            <MiniStat label="Total Amount" value={report.details.total_amount ? `₹${Number(report.details.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'N/A'} />
            <MiniStat label="Time Period" value={report.details.time_period} />
            <MiniStat label="Accounts" value={report.details.accounts_involved?.length ?? 0} />
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {report.evidence?.risk_factors?.length > 0 && (
        <div className="bg-[#0a0a0f]/40 rounded-xl p-6">
          <h4 className="text-red-400 font-semibold mb-3">🚨 Risk Factors</h4>
          <ul className="list-disc list-inside space-y-1">
            {report.evidence.risk_factors.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      {/* Suspicious Patterns */}
      {report.evidence?.suspicious_patterns?.length > 0 && (
        <div className="bg-[#0a0a0f]/40 rounded-xl p-6">
          <h4 className="text-yellow-400 font-semibold mb-3">⚠️ Suspicious Patterns</h4>
          <div className="flex flex-wrap gap-2">
            {report.evidence.suspicious_patterns.map((p, i) => (
              <span key={i} className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Regulatory Compliance */}
      {report.regulatory_compliance && (
        <div className="bg-[#0a0a0f]/40 rounded-xl p-6">
          <h4 className="text-blue-400 font-semibold mb-3">⚖️ Regulatory Compliance</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MiniStat label="Filing Deadline" value={report.regulatory_compliance.filing_deadline} />
            <MiniStat label="Validation" value={report.regulatory_compliance.validation_status} />
            <MiniStat label="Law Enforcement" value={report.regulatory_compliance.law_enforcement_notification ? 'Required' : 'Not Required'} />
          </div>
          {report.regulatory_compliance.codes?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {report.regulatory_compliance.codes.map((code, i) => (
                <span key={i} className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 text-xs font-mono">{code}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <div className="bg-[#0a0a0f]/40 rounded-xl p-6">
          <h4 className="text-green-400 font-semibold mb-3">✅ Recommendations</h4>
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">›</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-[#0a0a0f]/40 rounded-lg p-3 text-center">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className={`${color} font-semibold`}>{value ?? '—'}</div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-[#0a0a0f]/30 rounded-lg p-2">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="text-gray-200 font-medium text-sm">{value ?? '—'}</div>
    </div>
  )
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms))
}
