/**
 * MuleRiskPanel – Displays the comprehensive mule risk score
 * and sub-scores for a given account.
 */

import { RiskBadge } from '../shared/Badges'
import { Icon } from '../Icons/IconSystem'

function ScoreBar({ label, value, color = 'bg-[#00ff87]' }) {
  const pct = Math.round((value ?? 0) * 100)
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-semibold">{pct}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const LEVEL_COLORS = {
  LOW: 'text-green-400 border-green-400',
  MEDIUM: 'text-yellow-400 border-yellow-400',
  HIGH: 'text-orange-400 border-orange-400',
  CRITICAL: 'text-red-400 border-red-400',
}

export default function MuleRiskPanel({ riskData, networkData, layeringData, loading }) {
  if (loading) {
    return (
      <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00ff87] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Analysing account…</p>
        </div>
      </div>
    )
  }

  if (!riskData) {
    return (
      <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6 flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No data – enter an Account ID above</p>
      </div>
    )
  }

  const riskScore = riskData.risk_score ?? 0
  const riskLevel = riskData.risk_level ?? 'LOW'
  const levelClass = LEVEL_COLORS[riskLevel] ?? 'text-gray-400 border-gray-400'

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 text-lg">Mule Risk Score</h3>
        <div className="flex items-center space-x-6">
          <div
            className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${levelClass}`}
          >
            <span className="text-3xl font-bold">{Math.round(riskScore)}</span>
            <span className="text-xs">/ 100</span>
          </div>
          <div className="flex flex-col gap-2">
            <RiskBadge level={riskLevel} score={Math.round(riskScore)} size="lg" />
            <div className="text-gray-400 text-sm">
              Account: <span className="text-white font-mono">{riskData.account_id}</span>
            </div>
            <div className="text-gray-500 text-xs flex items-center gap-1">
              <Icon name="Calendar" size={12} />
              <span>{riskData.timestamp?.slice(0, 19)?.replace('T', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Risk Breakdown</h3>
        <ScoreBar label="Behavioural Score" value={riskData.behavioral_score} color="bg-[#00ff87]" />
        <ScoreBar label="Network Score" value={riskData.network_score ?? networkData?.network_risk_score} color="bg-[#00d4ff]" />
        <ScoreBar label="Layering Score" value={riskData.layering_score ?? layeringData?.layering_risk_score} color="bg-orange-400" />
        <ScoreBar label="Velocity Score" value={riskData.velocity_score} color="bg-red-400" />
      </div>

      {/* Network stats */}
      {networkData && (
        <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Network Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Connected Accounts', value: networkData.connected_accounts ?? '—' },
              { label: 'Community Size', value: networkData.community_size ?? '—' },
              { label: 'Hub Score', value: networkData.hub_score != null ? (networkData.hub_score * 100).toFixed(1) + '%' : '—' },
              { label: 'Funnel Score', value: networkData.funnel_score != null ? (networkData.funnel_score * 100).toFixed(1) + '%' : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3">
                <div className="text-gray-400 text-xs mb-1">{label}</div>
                <div className="text-white font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layering flags */}
      {layeringData && (
        <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Layering Indicators</h3>
          <div className="space-y-2">
            {[
              { flag: layeringData.smurfing_detected, label: 'Smurfing Detected' },
              { flag: layeringData.round_tripping, label: 'Round-Tripping' },
            ].map(({ flag, label }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm flex items-center gap-2">
                  <Icon name={flag ? "AlertTriangle" : "CheckCircle"} size={16} className={flag ? "text-red-400" : "text-green-400"} />
                  {label}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${flag ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                  {flag ? 'DETECTED' : 'CLEAR'}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Layering Chains</span>
              <span className="text-white font-semibold text-sm">{layeringData.layering_chains ?? 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
