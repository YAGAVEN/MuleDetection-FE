export const RISK_THRESHOLD_BANDS = {
  low_upto_pct_rank: 0.2,
  medium_upto_pct_rank: 0.4,
  high_upto_pct_rank: 0.6,
  critical_above_pct_rank: 0.8,
  suspicious_above_pct_rank: 0.5,
}

export const RISK_LEVEL_STYLES = {
  Critical: 'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)] bg-rose-500/5',
  High: 'shadow-[inset_0_0_0_1px_rgba(249,115,22,0.35)] bg-orange-500/5',
  Medium: 'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.22)] bg-cyan-500/5',
  Low: 'shadow-[inset_0_0_0_1px_rgba(148,163,184,0.24)] bg-slate-500/5',
}

export const ALERT_TONE = {
  critical: 'border-rose-300/35 bg-rose-500/10 text-rose-100',
  high: 'border-orange-300/35 bg-orange-500/10 text-orange-100',
  medium: 'border-cyan-300/35 bg-cyan-500/10 text-cyan-100',
  low: 'border-slate-300/30 bg-slate-500/10 text-slate-200',
}
