import { Fragment } from 'react'
import { ChevronDown, ChevronUp, Download, Filter, Search, Clock, FileText, GitBranch } from 'lucide-react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const riskGlow = {
  Critical: 'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)] bg-rose-500/5',
  High: 'shadow-[inset_0_0_0_1px_rgba(249,115,22,0.35)] bg-orange-500/5',
  Medium: 'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.22)] bg-cyan-500/5',
  Low: 'shadow-[inset_0_0_0_1px_rgba(148,163,184,0.24)] bg-slate-500/5',
}

export default function InvestigationTable() {
  const {
    query,
    riskLevel,
    sortField,
    sortDirection,
    page,
    pageSize,
    expandedRows,
    cases,
    setRiskLevel,
    setSort,
    toggleRow,
    setPage,
  } = useMDEStore()

  const filtered = cases
    .filter((row) => (riskLevel === 'All' ? true : row.riskLevel === riskLevel))
    .filter((row) => {
      const q = query.toLowerCase()
      return (
        row.id.toLowerCase().includes(q) ||
        row.pattern.toLowerCase().includes(q) ||
        row.investigator.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const left = a[sortField]
      const right = b[sortField]
      if (typeof left === 'number' && typeof right === 'number') {
        return sortDirection === 'desc' ? right - left : left - right
      }
      return sortDirection === 'desc'
        ? String(right).localeCompare(String(left))
        : String(left).localeCompare(String(right))
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:justify-between mb-4">
        <h2 className="text-white font-semibold">Investigation Case Table</h2>
        <div className="flex items-center gap-2">
          <div className="text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 flex items-center gap-1">
            <Search size={13} /> Live filtered
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-cyan-200" />
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="pl-7 pr-3 h-9 rounded-lg bg-white/5 border border-white/10 text-sm"
            >
              {['All', 'Critical', 'High', 'Medium', 'Low'].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              {[
                ['id', 'Case ID'],
                ['riskScore', 'Risk Score'],
                ['riskLevel', 'Risk Level'],
                ['pattern', 'Pattern Type'],
                ['accounts', 'Accounts'],
                ['amount', 'Amount'],
                ['timeline', 'Timeline'],
                ['status', 'Status'],
                ['investigator', 'Assigned'],
              ].map(([field, label]) => (
                <th key={field} className="py-3 pr-3">
                  <button onClick={() => setSort(field)} className="text-left inline-flex items-center gap-1 text-slate-300 hover:text-white">
                    {label}
                    {sortField === field && (sortDirection === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
                  </button>
                </th>
              ))}
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              const expanded = expandedRows.includes(row.id)
              return (
                <Fragment key={row.id}>
                  <tr key={row.id} className={`border-b border-white/5 ${riskGlow[row.riskLevel]}`}>
                    <td className="py-3 pr-3 font-mono text-cyan-200">{row.id}</td>
                    <td className="py-3 pr-3 text-white font-semibold">{row.riskScore}</td>
                    <td className="py-3 pr-3">{row.riskLevel}</td>
                    <td className="py-3 pr-3">{row.pattern}</td>
                    <td className="py-3 pr-3">{row.accounts}</td>
                    <td className="py-3 pr-3">{row.amount}</td>
                    <td className="py-3 pr-3">{row.timeline}</td>
                    <td className="py-3 pr-3">{row.status}</td>
                    <td className="py-3 pr-3">{row.investigator}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button className="text-xs px-2 py-1 rounded-md bg-cyan-500/15 border border-cyan-300/30 text-cyan-100 inline-flex items-center gap-1"><Clock size={12} /> Open CHRONOS</button>
                        <button className="text-xs px-2 py-1 rounded-md bg-violet-500/15 border border-violet-300/30 text-violet-100 inline-flex items-center gap-1"><FileText size={12} /> Generate SAR</button>
                        <button className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/20 text-slate-100 inline-flex items-center gap-1"><GitBranch size={12} /> View Graph</button>
                        <button className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/20 text-slate-100 inline-flex items-center gap-1"><Download size={12} /> Export</button>
                        <button onClick={() => toggleRow(row.id)} className="text-xs px-2 py-1 rounded-md bg-slate-500/20 border border-slate-300/20 text-slate-200">
                          {expanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-white/5 bg-slate-900/45">
                      <td colSpan={10} className="py-3 px-3 text-xs text-slate-300">
                        <span className="text-slate-400">Accounts involved:</span> {row.entities.join(', ')} ·
                        <span className="text-slate-400 ml-2">Trigger alerts:</span> {row.alerts} ·
                        <span className="text-slate-400 ml-2">Quick note:</span> suspected mule-ring coordination with layered outgoing fan-out.
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <p className="text-slate-400">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-200">Prev</button>
          <span className="text-cyan-200">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-200">Next</button>
        </div>
      </div>
    </GlassCard>
  )
}
