import ChronosPreviewPanel from '../components/ChronosPreviewPanel'
import NetworkGraphPreview from '../components/NetworkGraphPreview'
import PageTitle from '../components/PageTitle'

export default function ChronosEnginePage() {
  return (
    <section className="space-y-4 pb-4">
      <PageTitle
        title="CHRONOS Intelligence"
        subtitle="Replay laundering movement over time using live transactions, temporal edges, and risk distribution."
      />
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <GlassCard className="p-5 xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Transaction Flow</h3>
            <p className="text-xs text-slate-400">Volume and exposure by day</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={transactionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#64748b" />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="transactions" name="Transactions" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="amountLakh" name="Amount (Lakhs)" stroke="#f97316" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Temporal Money Flow Graph</h3>
            <p className="text-xs text-slate-400">Core CHRONOS replay visualization</p>
          </div>
          <div className="relative h-[320px] overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.12),_rgba(2,6,23,0.96)_62%)]">
            <svg viewBox="0 0 500 340" className="h-full w-full">
              <defs>
                <radialGradient id="clusterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
                </radialGradient>
              </defs>
              {Object.entries(clusterGraph.centers).map(([level, center]) => (
                <g key={level}>
                  <circle cx={center.x} cy={center.y} r="72" fill="url(#clusterGlow)" opacity="0.7" />
                  <circle cx={center.x} cy={center.y} r="66" fill="none" stroke={pieColors[level]} strokeOpacity="0.25" strokeDasharray="6 6" />
                  <text x={center.x} y={center.y - 80} textAnchor="middle" fill={pieColors[level]} fontSize="13" fontWeight="700">
                    {level}
                  </text>
                  <text x={center.x} y={center.y - 64} textAnchor="middle" fill="#cbd5e1" fontSize="9">
                    {clusterGraph.counts[level] || 0} accounts
                  </text>
                </g>
              ))}
              {clusterGraph.nodes.map((node) => {
                const fill = pieColors[node.riskLevel] || '#22d3ee'
                const size = 7 + Math.min(8, node.score * 4)
                return (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r={size + 5} fill={fill} fillOpacity="0.12" />
                    <circle cx={node.x} cy={node.y} r={size} fill={fill} fillOpacity="0.92" stroke="#e2e8f0" strokeOpacity="0.18" />
                    <text x={node.x} y={node.y - size - 4} textAnchor="middle" fill="#cbd5e1" fontSize="8">
                      {node.id}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-300">
            {['txn_velocity', 'fan_in_ratio', 'fan_out_ratio', 'net_flow', 'credit_debit_ratio', 'pct_within_6h', 'mean_passthrough_hours', 'channel_entropy'].map((feature) => (
              <div key={feature} className="rounded-md border border-white/10 bg-black/20 px-2 py-1">
                {feature}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Risk Mix</h3>
            <p className="text-xs text-slate-400">Mule probability distribution</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={4}>
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={pieColors[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
              {!sortedRows.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No uploaded risk scores available yet.
                  </td>
                </tr>
              )}
              {sortedRows.slice(0, 25).map((row) => (
                <tr
                  key={row.accountId}
                  onClick={() => setSelectedAccountId(row.accountId)}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                    selectedAccountId === row.accountId ? 'bg-cyan-500/10' : ''
                  }`}
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
                        navigate('/mde/cases', { state: { query: row.caseId || row.accountId } })
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
          <h3 className="text-white font-semibold">Chronos Data Notes</h3>
          <p className="text-xs text-slate-400">
            {timelineStatus === 'ready' ? `${timelineData.length} live transactions loaded` : timelineStatus === 'error' ? 'Live data unavailable' : 'Loading live data...'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <p>Charts are derived from uploaded transaction temp-data and risk-score output. The hero graph replays flows over time.</p>
        </div>
      </GlassCard>
    </section>
  )
}
