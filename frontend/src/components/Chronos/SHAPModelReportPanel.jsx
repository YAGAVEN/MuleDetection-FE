/**
 * SHAPModelReportPanel – Displays suspicious accounts and SHAP explanations
 * Shows which accounts are suspicious and why (feature contributions)
 */
import { useState, useEffect } from 'react'
import { notify } from '../shared/NotificationToast'

export default function SHAPModelReportPanel({ pipelineStatus, onReportLoaded }) {
  const [reports, setReports] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null)

  // Load reports when pipeline completes
  useEffect(() => {
    if (pipelineStatus?.case_generation === 'completed' || pipelineStatus?.case_generation?.status === 'completed') {
      loadModelReports()
    }
  }, [pipelineStatus])

  // Fallback: Load reports on mount if they might be available
  useEffect(() => {
    const tryLoadReports = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/shap/model-reports?limit=50')
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'success' && data.reports?.length > 0) {
            setReports(data.reports)
            setSelectedAccount(data.reports[0])
          }
        }
      } catch (err) {
        // Silent fail - will retry when pipelineStatus changes
      }
    }
    // Only try if reports are empty (first load)
    if (reports.length === 0) {
      tryLoadReports()
    }
  }, [])

  const loadModelReports = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/shap/model-reports?limit=50')
      if (!response.ok) throw new Error('Failed to load reports')

      const data = await response.json()
      
      if (data.status === 'success' && data.reports && data.reports.length > 0) {
        setReports(data.reports)
        setSelectedAccount(data.reports[0])
        notify(`Loaded SHAP analysis for ${data.total_reports} suspicious accounts`, 'success')
        if (onReportLoaded) onReportLoaded(data)
      } else {
        notify('No suspicious accounts found', 'info')
      }
    } catch (error) {
      notify(`Error loading reports: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 border border-[#00ff87]/20">
        <div className="animate-pulse text-center text-gray-400">Loading SHAP analysis...</div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 border border-[#00ff87]/20">
        <h3 className="text-2xl font-semibold text-[#00ff87] mb-4">📊 SHAP Model Report</h3>
        <div className="text-gray-400 text-center py-8">
          No SHAP reports available. Run the ML pipeline to generate analysis.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-[#00ff87]/20">
      <h3 className="text-2xl font-semibold mb-6 text-[#00ff87] flex items-center">
        📊 SHAP Model Report
        <span className="ml-3 text-sm bg-[#00ff87]/20 text-[#00ff87] px-3 py-1 rounded-full">
          {reports.length} Suspicious Accounts
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suspicious Accounts List */}
        <div className="bg-[#0a0a0f]/40 rounded-xl p-6 border border-[#FF3333]/20 max-h-[600px] overflow-y-auto">
          <h4 className="text-lg font-semibold text-white mb-4">Suspicious Accounts</h4>
          <div className="space-y-2">
            {reports.map((report, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedAccount(report)
                  setSelectedDetail(null)
                }}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedAccount?.account_id === report.account_id
                    ? 'bg-[#FF3333] text-white font-bold'
                    : 'bg-[#FF3333]/20 text-gray-300 hover:bg-[#FF3333]/30'
                }`}
              >
                <div className="text-sm font-mono">{report.account_id}</div>
                <div className="text-xs text-right mt-1">
                  <span
                    className={`px-2 py-1 rounded-full text-white text-xs font-bold ${
                      report.risk_level === 'CRITICAL'
                        ? 'bg-red-600'
                        : report.risk_level === 'HIGH'
                        ? 'bg-orange-600'
                        : 'bg-yellow-600'
                    }`}
                  >
                    {report.risk_level}
                  </span>
                </div>
                <div className="text-xs mt-2 text-gray-400">
                  Score: {report.ensemble_score?.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Details and SHAP Explanation */}
        <div className="lg:col-span-2">
          {selectedAccount ? (
            <div className="space-y-6">
              {/* Account Summary */}
              <div className="bg-[#0a0a0f]/40 rounded-xl p-6 border border-[#00d4ff]/20">
                <h4 className="text-lg font-semibold text-white mb-4">Account: {selectedAccount.account_id}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#00d4ff]/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Ensemble Score</div>
                    <div className="text-2xl font-bold text-[#00d4ff]">
                      {selectedAccount.ensemble_score?.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-[#FF3333]/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Risk Level</div>
                    <div className="text-xl font-bold text-[#FF3333]">{selectedAccount.risk_level}</div>
                  </div>
                  <div className="bg-[#4ade80]/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">LightGBM</div>
                    <div className="text-lg font-bold text-[#4ade80]">
                      {selectedAccount.lightgbm_score?.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-[#60a5fa]/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">GNN</div>
                    <div className="text-lg font-bold text-[#60a5fa]">
                      {selectedAccount.gnn_score?.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Risk Features (SHAP) */}
              <div className="bg-[#0a0a0f]/40 rounded-xl p-6 border border-[#FFB800]/20">
                <h4 className="text-lg font-semibold text-white mb-4">
                  🔍 Top Contributing Features
                </h4>
                <div className="space-y-3">
                  {selectedAccount.top_risk_features && selectedAccount.top_risk_features.length > 0 ? (
                    selectedAccount.top_risk_features.slice(0, 10).map((feature, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedDetail(feature)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedDetail?.feature_name === feature.feature_name
                            ? 'bg-[#FFB800]/30 border border-[#FFB800]'
                            : 'bg-[#FFB800]/10 hover:bg-[#FFB800]/20'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-mono text-white">{feature.feature_name}</div>
                          <div className="text-xs font-bold text-[#FFB800]">
                            {feature.contribution_percentage?.toFixed(1)}%
                          </div>
                        </div>
                        {/* Contribution Bar */}
                        <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#FFB800] h-full transition-all"
                            style={{
                              width: `${Math.min(feature.contribution_percentage || 0, 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-400">
                          <span>SHAP: {feature.shap_value?.toFixed(4)}</span>
                          <span>Contrib: {feature.contribution_percentage?.toFixed(2)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-sm">No feature data available</div>
                  )}
                </div>
              </div>

              {/* Detailed Feature Breakdown */}
              {selectedDetail && (
                <div className="bg-[#0a0a0f]/40 rounded-xl p-6 border border-[#00ff87]/20">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    📈 Feature Details: {selectedDetail.feature_name}
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Feature Name</span>
                      <span className="text-white font-mono">{selectedDetail.feature_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SHAP Value</span>
                      <span className="text-white font-bold text-[#00ff87]">
                        {selectedDetail.shap_value?.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contribution %</span>
                      <span className="text-white font-bold">
                        {selectedDetail.contribution_percentage?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Value</span>
                      <span className="text-white font-mono">{selectedDetail.base_value?.toFixed(4)}</span>
                    </div>
                    <div className="pt-3 border-t border-white/10">
                      <div className="text-xs text-gray-400 mb-2">Interpretation</div>
                      <div className="text-gray-300 text-xs leading-relaxed">
                        This feature {'contributes positively' in selectedDetail.feature_name || selectedDetail.shap_value > 0
                          ? 'increases'
                          : 'decreases'}{' '}
                        the model's suspicion score by {Math.abs(selectedDetail.shap_value)?.toFixed(4)} units.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-12">Select an account to view details</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="text-xs text-gray-400 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full" />
            <span>CRITICAL: Ensemble score 0.85-1.00</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-600 rounded-full" />
            <span>HIGH: Ensemble score 0.70-0.85</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-600 rounded-full" />
            <span>MEDIUM: Ensemble score 0.45-0.70</span>
          </div>
        </div>
      </div>
    </div>
  )
}
