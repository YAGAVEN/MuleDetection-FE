import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'
import PageTitle from '../components/PageTitle'
import GlassCard from '../components/GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const toTitle = (value = '') => {
  const text = String(value || '').toLowerCase()
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : 'Low'
}

const quantile = (values, q) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))
  return sorted[idx]
}

const toHistogramBins = (scores, binCount = 10) => {
  if (!scores.length) return []
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const span = Math.max(1, max - min)
  const width = span / binCount
  const bins = Array.from({ length: binCount }, (_, idx) => {
    const start = min + idx * width
    const end = idx === binCount - 1 ? max : start + width
    return {
      center: start + width / 2,
      rangeLabel: `${start.toFixed(1)} - ${end.toFixed(1)}`,
      count: 0,
    }
  })

  scores.forEach((score) => {
    const rawIdx = Math.floor((score - min) / width)
    const idx = Math.max(0, Math.min(binCount - 1, rawIdx))
    bins[idx].count += 1
  })

  return bins
}

const buildSignals = (row) => {
  const signals = []
  if (row.isSuspicious) {
    signals.push('Top suspicious cohort')
  }
  if (typeof row.gnnScore === 'number' && typeof row.lgbmScore === 'number') {
    const diff = Math.abs(row.gnnScore - row.lgbmScore)
    if (row.gnnScore > row.lgbmScore + 3) signals.push('Network-risk dominant')
    else if (row.lgbmScore > row.gnnScore + 3) signals.push('Behavior-risk dominant')
    else signals.push('Model consensus')
    if (diff >= 10) signals.push('Model divergence')
  } else {
    signals.push('Limited model explainability')
  }
  if (row.caseId) {
    signals.push(`Mapped to ${row.caseId}`)
  }
  return signals.slice(0, 3)
}

export default function ChronosEnginePage() {
  const navigate = useNavigate()
  const syncPipelineResults = useMDEStore((s) => s.syncPipelineResults)
  const predictionSummary = useMDEStore((s) => s.predictionSummary)
  const previousPredictionSummary = useMDEStore((s) => s.previousPredictionSummary)
  const riskScores = useMDEStore((s) => s.riskScores)
  const suspiciousAccounts = useMDEStore((s) => s.suspiciousAccounts)
  const cases = useMDEStore((s) => s.cases)
  const setQuery = useMDEStore((s) => s.setQuery)

  const [sortBy, setSortBy] = useState('ensembleScore')
  const [sortDirection, setSortDirection] = useState('desc')
  const [selectedAccountId, setSelectedAccountId] = useState('')

  useEffect(() => {
    syncPipelineResults()
    const timer = setInterval(() => {
      syncPipelineResults()
    }, 5000)
    return () => clearInterval(timer)
  }, [syncPipelineResults])

  const accountRows = useMemo(() => {
    const suspiciousMap = new Map(
      suspiciousAccounts.map((item) => [item.account_id, item]),
    )
    const caseMap = new Map()
    cases.forEach((item) => {
      ;(item.entities || []).forEach((accountId) => {
        caseMap.set(accountId, item)
      })
    })

    return riskScores
      .map((score) => {
        const suspicious = suspiciousMap.get(score.account_id)
        const linkedCase = caseMap.get(score.account_id)
        const row = {
          accountId: score.account_id,
          ensembleScore: Number(score.ensemble_score || 0),
          riskLevel: toTitle(score.risk_level),
          lgbmScore: suspicious?.lightgbm_score ?? suspicious?.lgbm_score ?? null,
          gnnScore: suspicious?.gnn_score ?? null,
          isSuspicious: Boolean(suspicious),
          caseId: linkedCase?.id || '',
        }
        return { ...row, signals: buildSignals(row) }
      })
      .sort((a, b) => b.ensembleScore - a.ensembleScore)
  }, [cases, riskScores, suspiciousAccounts])

  useEffect(() => {
    if (!selectedAccountId && accountRows.length) {
      setSelectedAccountId(accountRows[0].accountId)
    }
  }, [accountRows, selectedAccountId])

  const sortedRows = useMemo(() => {
    const rows = [...accountRows]
    rows.sort((a, b) => {
      const left = a[sortBy]
      const right = b[sortBy]
      if (typeof left === 'number' && typeof right === 'number') {
        return sortDirection === 'desc' ? right - left : left - right
      }
      return sortDirection === 'desc'
        ? String(right).localeCompare(String(left))
        : String(left).localeCompare(String(right))
    })
    return rows
  }, [accountRows, sortBy, sortDirection])

  const selectedRow = useMemo(
    () => sortedRows.find((row) => row.accountId === selectedAccountId) || null,
    [sortedRows, selectedAccountId],
  )

  const scoreSeries = useMemo(
    () => riskScores.map((row) => Number(row.ensemble_score || 0)),
    [riskScores],
  )
  const histogram = useMemo(() => toHistogramBins(scoreSeries, 12), [scoreSeries])
  const cutLines = useMemo(
    () => ({
      q33: quantile(scoreSeries, 1 / 3),
      q67: quantile(scoreSeries, 2 / 3),
      q90: quantile(scoreSeries, 0.9),
      q80: quantile(scoreSeries, 0.8),
    }),
    [scoreSeries],
  )

  const networkData = useMemo(() => {
    const topSuspicious = sortedRows.filter((row) => row.isSuspicious).slice(0, 10)
    const centerNode = {
      id: 'cluster',
      data: { label: `Suspicious Cluster (${topSuspicious.length})` },
      position: { x: 220, y: 180 },
      style: {
        border: '1px solid rgba(244,63,94,0.8)',
        background: 'rgba(159,18,57,0.2)',
        color: '#fecdd3',
        borderRadius: 12,
        padding: '8px 10px',
        fontSize: 12,
      },
    }
    const nodes = [centerNode]
    const edges = []

    topSuspicious.forEach((row, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(1, topSuspicious.length)
      const x = 220 + Math.cos(angle) * 180
      const y = 180 + Math.sin(angle) * 130
      nodes.push({
        id: row.accountId,
        data: { label: `${row.accountId} · ${row.riskLevel}` },
        position: { x, y },
        style: {
          border: '1px solid rgba(34,211,238,0.75)',
          background: 'rgba(8,47,73,0.35)',
          color: '#cffafe',
          borderRadius: 12,
          padding: '8px 10px',
          fontSize: 11,
        },
      })
      edges.push({
        id: `edge-${row.accountId}`,
        source: 'cluster',
        target: row.accountId,
        animated: true,
        style: { stroke: '#22d3ee', strokeWidth: 1.5 },
      })
    })

    return { nodes, edges }
  }, [sortedRows])

  const summaryCards = useMemo(
    () => [
      { key: 'low_count', label: 'Low', value: predictionSummary?.low_count || 0, color: 'text-slate-200' },
      {
        key: 'medium_count',
        label: 'Medium',
        value: predictionSummary?.medium_count || 0,
        color: 'text-cyan-200',
      },
      { key: 'high_count', label: 'High', value: predictionSummary?.high_count || 0, color: 'text-orange-200' },
      {
        key: 'critical_count',
        label: 'Critical',
        value: predictionSummary?.critical_count || 0,
        color: 'text-rose-200',
      },
      {
        key: 'suspicious_accounts_count',
        label: 'Suspicious',
        value: predictionSummary?.suspicious_accounts_count || 0,
        color: 'text-violet-200',
      },
    ],
    [predictionSummary],
  )

  const getTrend = (key) => {
    if (!previousPredictionSummary) return null
    const current = Number(predictionSummary?.[key] || 0)
    const previous = Number(previousPredictionSummary?.[key] || 0)
    return current - previous
  }

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
      return
    }
    setSortBy(field)
    setSortDirection('desc')
  }

  return (
    <section className="space-y-4 pb-4">
      <PageTitle
        title="CHRONOS Prediction Intelligence"
        subtitle="Unified model analytics, case prioritization, and suspicious-account timeline/network monitoring."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {summaryCards.map((card) => {
          const trend = getTrend(card.key)
          return (
            <GlassCard key={card.key} className="p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-xs text-slate-400">
                {trend === null ? 'No previous run' : `${trend >= 0 ? '+' : ''}${trend} vs previous run`}
              </p>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
        <GlassCard className="p-5 2xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Ensemble Score Distribution</h3>
            <p className="text-xs text-cyan-200">
              Dynamic percentile cut lines: P33 / P67 / P90 (suspicious: P80+)
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" dataKey="center" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#020617', border: '1px solid #334155' }}
                  formatter={(value) => [value, 'Accounts']}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.rangeLabel || String(label)
                  }
                />
                <ReferenceLine x={cutLines.q33} stroke="#94a3b8" strokeDasharray="4 4" label="P33" />
                <ReferenceLine x={cutLines.q67} stroke="#22d3ee" strokeDasharray="4 4" label="P67" />
                <ReferenceLine x={cutLines.q80} stroke="#a78bfa" strokeDasharray="4 4" label="P80" />
                <ReferenceLine x={cutLines.q90} stroke="#f43f5e" strokeDasharray="4 4" label="P90" />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-white font-semibold mb-3">Account Drill-down</h3>
          {selectedRow ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Account</p>
                <p className="text-cyan-200 font-mono">{selectedRow.accountId}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="text-[11px] text-slate-400">LGBM</p>
                  <p className="text-sm text-white">{selectedRow.lgbmScore?.toFixed?.(2) ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="text-[11px] text-slate-400">GNN</p>
                  <p className="text-sm text-white">{selectedRow.gnnScore?.toFixed?.(2) ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="text-[11px] text-slate-400">Ensemble</p>
                  <p className="text-sm text-white">{selectedRow.ensembleScore.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Feature highlights</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRow.signals.map((signal) => (
                    <span
                      key={signal}
                      className="text-[11px] px-2 py-1 rounded-md border border-cyan-300/30 bg-cyan-500/10 text-cyan-100"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRow.caseId) {
                      setQuery(selectedRow.caseId)
                    } else {
                      setQuery(selectedRow.accountId)
                    }
                    navigate('/mde/cases')
                  }}
                  className="w-full h-9 rounded-lg border border-violet-300/30 bg-violet-500/10 text-violet-100 text-sm"
                >
                  Open Case
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No scored accounts available yet.</p>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Prioritized Accounts</h3>
          <p className="text-xs text-slate-400">Sorted by model score with case handoff</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                {[
                  ['accountId', 'Account'],
                  ['ensembleScore', 'Ensemble'],
                  ['riskLevel', 'Risk'],
                  ['lgbmScore', 'LGBM'],
                  ['gnnScore', 'GNN'],
                ].map(([field, label]) => (
                  <th key={field} className="py-2.5 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(field)}
                      className="text-slate-300 hover:text-white"
                    >
                      {label}
                    </button>
                  </th>
                ))}
                <th className="py-2.5 pr-3">Top signals</th>
                <th className="py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.slice(0, 25).map((row) => (
                <tr
                  key={row.accountId}
                  onClick={() => setSelectedAccountId(row.accountId)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                >
                  <td className="py-2.5 pr-3 font-mono text-cyan-200">{row.accountId}</td>
                  <td className="py-2.5 pr-3 text-white">{row.ensembleScore.toFixed(2)}</td>
                  <td className="py-2.5 pr-3">{row.riskLevel}</td>
                  <td className="py-2.5 pr-3">{row.lgbmScore?.toFixed?.(2) ?? '—'}</td>
                  <td className="py-2.5 pr-3">{row.gnnScore?.toFixed?.(2) ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-xs text-slate-300">{row.signals.join(' • ')}</td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setQuery(row.caseId || row.accountId)
                        navigate('/mde/cases')
                      }}
                      className="px-2 py-1 text-xs rounded-md border border-cyan-300/30 bg-cyan-500/10 text-cyan-100"
                    >
                      Open Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Suspicious Network View</h3>
          <p className="text-xs text-slate-400">Suspicious subset only</p>
        </div>
        <div className="h-[320px] rounded-xl border border-white/10 overflow-hidden bg-slate-950/40">
          <ReactFlow
            nodes={networkData.nodes}
            edges={networkData.edges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <MiniMap zoomable pannable nodeColor="#22d3ee" />
            <Controls />
            <Background color="#1e293b" gap={24} />
          </ReactFlow>
        </div>
      </GlassCard>
    </section>
  )
}
