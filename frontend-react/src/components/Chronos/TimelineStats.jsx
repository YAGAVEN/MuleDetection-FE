/**
 * Timeline Statistics with Visual Charts
 * Replaces numerical data with graphs and charts for easier understanding
 * CHRONOS Module - Cyan Theme
 */
import { useEffect, useState } from 'react'

export default function TimelineStats({ data = [] }) {
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    medium: 0,
    low: 0,
    avgAmount: 0,
    totalAmount: 0
  })

  useEffect(() => {
    if (data.length === 0) return

    const critical = data.filter(t => t.suspicious_score > 0.7).length
    const medium = data.filter(t => t.suspicious_score > 0.4 && t.suspicious_score <= 0.7).length
    const low = data.filter(t => t.suspicious_score <= 0.4).length
    const totalAmount = data.reduce((sum, t) => sum + (t.amount || 0), 0)

    setStats({
      total: data.length,
      critical,
      medium,
      low,
      avgAmount: totalAmount / data.length,
      totalAmount
    })
  }, [data])

  const criticalPercent = stats.total > 0 ? (stats.critical / stats.total) * 100 : 0
  const mediumPercent = stats.total > 0 ? (stats.medium / stats.total) * 100 : 0
  const lowPercent = stats.total > 0 ? (stats.low / stats.total) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Risk Distribution Bar Chart */}
      <div>
        <h5 className="text-lg font-semibold text-[#00CED1] uppercase tracking-wide mb-4">
          Risk Distribution Overview
        </h5>
        
        {/* Stacked Bar Chart */}
        <div className="relative h-24 bg-[#0a0a0f]/60 rounded-xl overflow-hidden border-2 border-[#00CED1]/20 mb-4">
          {/* Critical segment */}
          {criticalPercent > 0 && (
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#FF3333] to-[#E62E2E] flex items-center justify-center transition-all duration-1000"
              style={{ width: `${criticalPercent}%` }}
            >
              {criticalPercent > 10 && (
                <div className="text-center px-2">
                  <div className="text-lg font-bold text-white">{stats.critical}</div>
                  <div className="text-xs text-white/90 uppercase">Critical</div>
                </div>
              )}
            </div>
          )}
          
          {/* Medium segment */}
          {mediumPercent > 0 && (
            <div
              className="absolute top-0 h-full bg-gradient-to-r from-[#FFB800] to-[#FF8C00] flex items-center justify-center transition-all duration-1000 delay-200"
              style={{ 
                left: `${criticalPercent}%`,
                width: `${mediumPercent}%` 
              }}
            >
              {mediumPercent > 10 && (
                <div className="text-center px-2">
                  <div className="text-lg font-bold text-[#0a0a0f]">{stats.medium}</div>
                  <div className="text-xs text-[#0a0a0f]/90 uppercase">Medium</div>
                </div>
              )}
            </div>
          )}
          
          {/* Low segment */}
          {lowPercent > 0 && (
            <div
              className="absolute top-0 h-full bg-gradient-to-r from-[#00CED1] to-[#20B2AA] flex items-center justify-center transition-all duration-1000 delay-400"
              style={{ 
                left: `${criticalPercent + mediumPercent}%`,
                width: `${lowPercent}%` 
              }}
            >
              {lowPercent > 10 && (
                <div className="text-center px-2">
                  <div className="text-lg font-bold text-[#0a0a0f]">{stats.low}</div>
                  <div className="text-xs text-[#0a0a0f]/90 uppercase">Low Risk</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend with percentages */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-[#FF3333] to-[#E62E2E]" />
            <span className="text-gray-300">
              Critical <span className="text-[#FF3333] font-semibold">({criticalPercent.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-[#FFB800] to-[#FF8C00]" />
            <span className="text-gray-300">
              Medium <span className="text-[#FFB800] font-semibold">({mediumPercent.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-[#00CED1] to-[#20B2AA]" />
            <span className="text-gray-300">
              Low Risk <span className="text-[#00CED1] font-semibold">({lowPercent.toFixed(1)}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards with Visual Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Transactions */}
        <div className="bg-[#00CED1]/10 border-2 border-[#00CED1]/30 rounded-xl p-4 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-3xl font-bold text-[#00CED1] mb-1">{stats.total}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Total Transactions</div>
          </div>
          {/* Background indicator */}
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-[#00CED1]/10 rounded-tl-full" />
        </div>

        {/* Critical Count with visual severity */}
        <div className="bg-[#FF3333]/10 border-2 border-[#FF3333]/30 rounded-xl p-4 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-3xl font-bold text-[#FF3333] mb-1">{stats.critical}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Critical Alerts</div>
          </div>
          {/* Severity indicator bars */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-1 bg-[#FF3333]/30"
                style={{ height: `${(i + 1) * 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* Average Amount */}
        <div className="bg-[#FFB800]/10 border-2 border-[#FFB800]/30 rounded-xl p-4 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-2xl font-bold text-[#FFB800] mb-1">
              ₹{(stats.avgAmount / 1000).toFixed(1)}K
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Avg Amount</div>
          </div>
          {/* Progress arc */}
          <div className="absolute -bottom-2 -right-2 w-12 h-12 border-4 border-[#FFB800]/20 border-t-[#FFB800]/60 rounded-full" 
               style={{ transform: 'rotate(45deg)' }} />
        </div>

        {/* Total Volume */}
        <div className="bg-white/5 border-2 border-white/10 rounded-xl p-4 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-2xl font-bold text-white mb-1">
              ₹{(stats.totalAmount / 1000000).toFixed(2)}M
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Total Volume</div>
          </div>
          {/* Stacked bars indicator */}
          <div className="absolute bottom-2 right-2 flex gap-0.5">
            <div className="w-1 h-6 bg-white/20" />
            <div className="w-1 h-8 bg-white/30" />
            <div className="w-1 h-4 bg-white/20" />
          </div>
        </div>
      </div>

      {/* Risk Level Visual Bars */}
      <div className="space-y-3">
        <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Detailed Risk Breakdown
        </h5>
        
        {/* Critical Risk Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300 font-medium">Critical Risk</span>
            <span className="text-sm text-[#FF3333] font-bold">{stats.critical} ({criticalPercent.toFixed(1)}%)</span>
          </div>
          <div className="h-3 bg-[#0a0a0f]/60 rounded-full overflow-hidden border border-[#FF3333]/20">
            <div 
              className="h-full bg-gradient-to-r from-[#FF3333] to-[#E62E2E] transition-all duration-1000 relative"
              style={{ width: `${criticalPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Medium Risk Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300 font-medium">Medium Risk</span>
            <span className="text-sm text-[#FFB800] font-bold">{stats.medium} ({mediumPercent.toFixed(1)}%)</span>
          </div>
          <div className="h-3 bg-[#0a0a0f]/60 rounded-full overflow-hidden border border-[#FFB800]/20">
            <div 
              className="h-full bg-gradient-to-r from-[#FFB800] to-[#FF8C00] transition-all duration-1000"
              style={{ width: `${mediumPercent}%` }}
            />
          </div>
        </div>

        {/* Low Risk Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300 font-medium">Low Risk</span>
            <span className="text-sm text-[#00CED1] font-bold">{stats.low} ({lowPercent.toFixed(1)}%)</span>
          </div>
          <div className="h-3 bg-[#0a0a0f]/60 rounded-full overflow-hidden border border-[#00CED1]/20">
            <div 
              className="h-full bg-gradient-to-r from-[#00CED1] to-[#20B2AA] transition-all duration-1000"
              style={{ width: `${lowPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
