/**
 * Professional Pictorial Timeline with Animated Progress Indicators
 * Replaces: Numerical timeline overview
 * CHRONOS Module - Cyan Theme
 */
import { useEffect, useState } from 'react'

export default function TimelineProgressBar({ data = [] }) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  
  useEffect(() => {
    // Animate progress on mount
    const timer = setTimeout(() => setAnimatedProgress(100), 100)
    return () => clearTimeout(timer)
  }, [data])
  
  // Calculate metrics from data
  const totalTransactions = data.length
  const suspiciousCount = data.filter(t => t.suspicious_score > 0.5).length
  const normalCount = totalTransactions - suspiciousCount
  const suspiciousPercentage = totalTransactions > 0 ? (suspiciousCount / totalTransactions) * 100 : 0
  const normalPercentage = 100 - suspiciousPercentage
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-[#00CED1] uppercase tracking-wide">
          Transaction Flow Analysis
        </h4>
        <div className="text-sm text-gray-400">
          Total: <span className="text-white font-semibold">{totalTransactions}</span>
        </div>
      </div>
      
      {/* Animated Progress Bar */}
      <div className="relative h-16 bg-[#0a0a0f]/60 rounded-xl overflow-hidden border-2 border-[#00CED1]/20">
        {/* Normal transactions segment */}
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00CED1] to-[#20B2AA] transition-all duration-1000 ease-out"
          style={{ width: `${(normalPercentage * animatedProgress) / 100}%` }}
        >
          <div className="h-full flex items-center justify-center">
            {normalPercentage > 15 && (
              <span className="text-xs font-semibold text-[#0a0a0f] uppercase tracking-wide">
                Normal: {normalCount}
              </span>
            )}
          </div>
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
        
        {/* Suspicious transactions segment */}
        <div
          className="absolute right-0 top-0 h-full bg-gradient-to-r from-[#FF3333] to-[#C62828] transition-all duration-1000 ease-out delay-300"
          style={{ width: `${(suspiciousPercentage * animatedProgress) / 100}%` }}
        >
          <div className="h-full flex items-center justify-center">
            {suspiciousPercentage > 15 && (
              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                Suspicious: {suspiciousCount}
              </span>
            )}
          </div>
          {/* Pulsing alert effect */}
          <div className="absolute inset-0 bg-white/10 animate-pulse" />
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-[#00CED1] to-[#20B2AA]" />
          <span className="text-gray-300">
            Normal Transactions <span className="text-white font-semibold">({normalPercentage.toFixed(1)}%)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-[#FF3333] to-[#C62828]" />
          <span className="text-gray-300">
            Suspicious Activity <span className="text-[#FF3333] font-semibold">({suspiciousPercentage.toFixed(1)}%)</span>
          </span>
        </div>
      </div>
      
      {/* Data Points Timeline */}
      <div className="relative pt-8">
        <div className="absolute left-0 right-0 top-12 h-0.5 bg-[#00CED1]/20" />
        
        <div className="flex justify-between items-start relative z-10">
          {[0, 25, 50, 75, 100].map((point) => {
            const index = Math.floor((point / 100) * (totalTransactions - 1))
            const transaction = data[index]
            const isSuspicious = transaction?.suspicious_score > 0.5
            
            return (
              <div key={point} className="flex flex-col items-center">
                {/* Data point node */}
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    isSuspicious
                      ? 'bg-[#FF3333] shadow-lg shadow-[#FF3333]/50'
                      : 'bg-[#00CED1] shadow-lg shadow-[#00CED1]/50'
                  }`}
                  style={{ animationDelay: `${point * 10}ms` }}
                />
                
                {/* Timeline marker */}
                <div className="mt-2 text-xs text-gray-500 uppercase tracking-wide">
                  {point}%
                </div>
                
                {/* Transaction indicator */}
                {transaction && (
                  <div className="mt-1 text-xs text-gray-400 font-mono">
                    {transaction.amount ? `₹${(transaction.amount / 1000).toFixed(0)}K` : '—'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="bg-[#00CED1]/10 border border-[#00CED1]/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#00CED1]">{normalCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Normal</div>
        </div>
        <div className="bg-[#FF3333]/10 border border-[#FF3333]/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#FF3333]">{suspiciousCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Alerts</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{suspiciousPercentage.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Risk Rate</div>
        </div>
      </div>
    </div>
  )
}
