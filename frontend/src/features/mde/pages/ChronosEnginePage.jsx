import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow'
import 'reactflow/dist/style.css'

import ChronosPreviewPanel from '../components/ChronosPreviewPanel'
import NetworkGraphPreview from '../components/NetworkGraphPreview'
import PageTitle from '../components/PageTitle'
import GlassCard from '../components/GlassCard'

export default function ChronosEnginePage() {
  const navigate = useNavigate()
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [sortField, setSortField] = useState('ensembleScore')
  const [sortOrder, setSortOrder] = useState('desc')
  const [query, setQuery] = useState('')
  const [accountData, setAccountData] = useState([])
  const [networkData, setNetworkData] = useState({ nodes: [], edges: [] })

  // Load mock data
  useEffect(() => {
    // Sample account data for demonstration
    const mockAccounts = [
      { accountId: 'ACC001', ensembleScore: 0.92, riskLevel: 'CRITICAL', lgbmScore: 0.95, gnnScore: 0.89, signals: ['High Velocity', 'Unusual Channel'], caseId: 'CASE-001' },
      { accountId: 'ACC002', ensembleScore: 0.78, riskLevel: 'HIGH', lgbmScore: 0.80, gnnScore: 0.76, signals: ['Round Trip', 'Multiple Channels'], caseId: 'CASE-002' },
      { accountId: 'ACC003', ensembleScore: 0.65, riskLevel: 'MEDIUM', lgbmScore: 0.68, gnnScore: 0.62, signals: ['Pattern Match'], caseId: 'CASE-003' },
      { accountId: 'ACC004', ensembleScore: 0.88, riskLevel: 'CRITICAL', lgbmScore: 0.85, gnnScore: 0.91, signals: ['Layering Detected', 'Cross Border'], caseId: 'CASE-004' },
      { accountId: 'ACC005', ensembleScore: 0.72, riskLevel: 'HIGH', lgbmScore: 0.70, gnnScore: 0.74, signals: ['Structuring'], caseId: 'CASE-005' },
    ]
    setAccountData(mockAccounts)

    // Sample network data
    setNetworkData({
      nodes: [
        { id: 'ACC001', label: 'ACC001', position: { x: 0, y: 0 } },
        { id: 'ACC002', label: 'ACC002', position: { x: 100, y: 100 } },
        { id: 'ACC003', label: 'ACC003', position: { x: -100, y: 100 } },
      ],
      edges: [
        { id: 'e1-2', source: 'ACC001', target: 'ACC002' },
        { id: 'e1-3', source: 'ACC001', target: 'ACC003' },
      ],
    })
  }, [])

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedRows = useMemo(() => {
    const sorted = [...accountData].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const comparison = aVal > bVal ? 1 : -1
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [accountData, sortField, sortOrder])

  return (
    <section className="space-y-4 pb-4">
      <PageTitle
        title="CHRONOS Intelligence"
        subtitle="Replay laundering movement over time and inspect suspicious graph clusters."
      />
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <ChronosPreviewPanel />
        <NetworkGraphPreview />
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
