import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, FileChartColumnIncreasing, ShieldCheck, Bot, CircleAlert } from 'lucide-react'
import api from '../../../services/api'
import PageTitle from '../components/PageTitle'
import GlassCard from '../components/GlassCard'

const statusTone = {
  idle: 'text-slate-300 bg-slate-500/10 border-slate-300/20',
  generating: 'text-cyan-100 bg-cyan-500/10 border-cyan-300/30',
  completed: 'text-emerald-100 bg-emerald-500/10 border-emerald-300/30',
  failed: 'text-rose-100 bg-rose-500/10 border-rose-300/30',
}

const reportLabel = {
  individual_account: 'Individual Account Report',
  full_investigation: 'Complete Investigation Report',
  hydra_training: 'HYDRA Training Report',
}

const normalizeCase = (item) => ({
  id: item.id ?? item.case_id ?? item.caseId,
  accountId: item.account_id ?? item.entities?.[0] ?? item.entities?.[0]?.account_id ?? item.id ?? item.case_id,
  riskScore: item.riskScore ?? item.risk_score ?? 0,
  riskLevel: item.riskLevel ?? item.risk_level ?? 'Medium',
  pattern: item.pattern ?? item.pattern_type ?? 'Unknown',
  accounts: item.accounts ?? item.account_count ?? 0,
  investigator: item.investigator ?? item.assigned_to ?? 'Auto-assigned',
})

export default function AutoSARPage() {
  const [cases, setCases] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [reports, setReports] = useState([])
  const [status, setStatus] = useState({ state: 'idle', message: 'Select an account and generate a report.' })

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedAccountId) || cases[0] || null,
    [cases, selectedAccountId],
  )

  useEffect(() => {
    let active = true

    api.getAutoSarCases()
      .then((response) => {
        if (!active) return
        const nextCases = Array.isArray(response?.cases) ? response.cases.map(normalizeCase) : []
        setCases(nextCases)
        if (nextCases.length) {
          setSelectedAccountId(nextCases[0].id)
        }
      })
      .catch((error) => {
        if (!active) return
        setStatus({ state: 'failed', message: error.message || 'Unable to load suspicious accounts.' })
      })

    return () => {
      active = false
    }
  }, [])

  const addReport = (report) => {
    const normalized = {
      report_id: report.report_id,
      report_type: report.report_type,
      title: report.title || report.report_id,
      generated_at: report.generated_at || new Date().toISOString(),
      risk_level: report.risk_level || 'INFO',
      pdf_path: report.pdf_path,
    }
    setReports((current) => [normalized, ...current.filter((item) => item.report_id !== normalized.report_id)])
    return normalized
  }

  const runReport = async (runner, message) => {
    if (status.state === 'generating') return
    setStatus({ state: 'generating', message })
    try {
      const report = await runner()
      addReport(report)
      setStatus({ state: 'completed', message: `${reportLabel[report.report_type] || 'Report'} ready.` })
    } catch (error) {
      setStatus({ state: 'failed', message: error.message || 'Report generation failed.' })
    }
  }

  const downloadReport = async (reportId) => {
    const download = await api.downloadAutoSarReport(reportId)
    const anchor = document.createElement('a')
    anchor.href = download.url
    anchor.download = download.filename || `${reportId}.pdf`
    anchor.click()
    URL.revokeObjectURL(download.url)
  }

  return (
    <section className="space-y-4">
      <PageTitle
        title="Auto-SAR Reports"
        subtitle="Generate individual account, full investigation, and HYDRA training PDFs."
      />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-cyan-100">
            <ShieldCheck size={16} />
            <h3 className="font-semibold">Suspicious Accounts</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">Select one account for a focused investigation report.</p>

          <div className="mt-4 space-y-2">
            {cases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedAccountId(item.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                  item.id === selectedAccountId
                    ? 'border-cyan-300/30 bg-cyan-500/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{item.id}</span>
                  <span className="text-xs text-slate-400">{item.riskLevel}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Score {item.riskScore} · {item.pattern} · {item.accounts} accounts
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-100">
                  <CircleAlert size={16} />
                  <h3 className="font-semibold">Report Generation</h3>
                </div>
                <p className="mt-1 text-xs text-slate-400">Minimal workflow focused only on PDF generation.</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs ${statusTone[status.state] || statusTone.idle}`}>
                {status.message}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                disabled={!selectedCase?.accountId}
                onClick={() => runReport(
                  () => api.generateAutoSarAccountReport(selectedCase.accountId),
                  `Generating report for ${selectedCase.accountId}`,
                )}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileChartColumnIncreasing size={16} />
                Generate Report
              </button>

              <button
                type="button"
                onClick={() => runReport(
                  () => api.generateAutoSarFullInvestigationReport(),
                  'Generating complete investigation report',
                )}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100"
              >
                <ShieldCheck size={16} />
                Complete Investigation
              </button>

              <button
                type="button"
                onClick={() => runReport(
                  () => api.generateAutoSarHydraReport(),
                  'Generating HYDRA training report',
                )}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100"
              >
                <Bot size={16} />
                HYDRA Report
              </button>
            </div>

            {selectedCase ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <div className="font-medium text-white">Selected Account</div>
                <div className="mt-1 text-xs text-slate-400">
                  {selectedCase.accountId} · Risk {selectedCase.riskScore} · {selectedCase.riskLevel}
                </div>
              </div>
            ) : null}
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2 text-cyan-100">
              <ArrowDownToLine size={16} />
              <h3 className="font-semibold">Generated Reports</h3>
            </div>
            <div className="mt-4 space-y-3">
              {reports.length ? reports.map((report) => (
                <div key={report.report_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div>
                    <div className="text-sm font-medium text-white">{report.title}</div>
                    <div className="text-xs text-slate-400">
                      {report.report_type} · {report.risk_level} · {new Date(report.generated_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadReport(report.report_id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100"
                  >
                    <ArrowDownToLine size={14} />
                    Download PDF
                  </button>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                  No reports generated yet.
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
