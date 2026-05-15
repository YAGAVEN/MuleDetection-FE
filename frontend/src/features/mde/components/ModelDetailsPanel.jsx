import { useMemo } from 'react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const formatPct = (value) => `${(Number(value) * 100).toFixed(2)}%`
const formatPctSafe = (value, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return formatPct(fallback)
  return formatPct(numeric)
}
const formatNumSafe = (value, digits = 4, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return Number(fallback).toFixed(digits)
  return numeric.toFixed(digits)
}

const metricTile = (label, value, hint = '') => ({ label, value, hint })
const modelTone = {
  ensemble: {
    title: 'text-cyan-200',
    version: 'text-cyan-100',
    border: 'border-cyan-300/20',
    bg: 'bg-cyan-500/5',
  },
  lgbm: {
    title: 'text-violet-200',
    version: 'text-violet-100',
    border: 'border-violet-300/20',
    bg: 'bg-violet-500/5',
  },
  gnn: {
    title: 'text-emerald-200',
    version: 'text-emerald-100',
    border: 'border-emerald-300/20',
    bg: 'bg-emerald-500/5',
  },
}
const metricToneByLabel = {
  'Model Accuracy': 'text-emerald-200',
  Latency: 'text-cyan-200',
  Precision: 'text-violet-200',
  Recall: 'text-indigo-200',
  'F1 Score': 'text-fuchsia-200',
  AUC: 'text-sky-200',
  'GAN Inception Score': 'text-amber-200',
  'Synthetic Samples': 'text-teal-200',
  'Accounts Scored': 'text-blue-200',
  'Suspicious Accounts': 'text-rose-200',
  'Suspicious Rate': 'text-orange-200',
  'Risk Distribution': 'text-cyan-100',
  'Risk Strategy': 'text-violet-100',
  'Cases Ready': 'text-emerald-200',
  'Parquet Export': 'text-indigo-200',
  'Command Center Version': 'text-fuchsia-200',
  'GAN Version': 'text-amber-200',
  'Attacker Score': 'text-rose-200',
  'Defender Score': 'text-emerald-200',
  'Resilience Score': 'text-cyan-200',
  'HYDRA Training': 'text-violet-200',
  'Last Prediction Run': 'text-slate-200',
}
const thresholdTone = ['text-cyan-200', 'text-violet-200', 'text-emerald-200', 'text-amber-200', 'text-fuchsia-200']

const formatTimestamp = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

export default function ModelDetailsPanel() {
  const modelInfo = useMDEStore((s) => s.modelInfo)
  const predictionSummary = useMDEStore((s) => s.predictionSummary)
  const kpis = useMDEStore((s) => s.kpis)
  const modelMetrics = modelInfo?.metrics || {}

  const accuracyKpi = useMemo(
    () =>
      kpis.find(
        (kpi) =>
          String(kpi?.id || '').toLowerCase().includes('accuracy') ||
          String(kpi?.title || '').toLowerCase().includes('accuracy'),
      ),
    [kpis],
  )

  const latencyKpi = useMemo(
    () =>
      kpis.find(
        (kpi) =>
          String(kpi?.title || '').toLowerCase().includes('latency') ||
          String(kpi?.trend || '').toLowerCase().includes('latency'),
      ),
    [kpis],
  )

  const total = Number(predictionSummary?.total_accounts_scored || 0)
  const suspicious = Number(predictionSummary?.suspicious_accounts_count || 0)
  const suspiciousRate = total > 0 ? `${((suspicious / total) * 100).toFixed(2)}%` : 'N/A'

  const modelCards = [
    {
      key: 'ensemble',
      title: 'Ensemble Model',
      version: modelInfo?.ensemble_model || 'N/A',
      artifact: modelInfo?.model_artifacts?.ensemble || 'Runtime artifact',
      weight:
        modelInfo?.ensemble_weights && typeof modelInfo.ensemble_weights === 'object'
          ? Object.entries(modelInfo.ensemble_weights)
              .map(([name, value]) => `${String(name).toUpperCase()}: ${formatPct(value)}`)
              .join(' | ')
          : 'N/A',
      extra: `Loaded: ${modelInfo?.loaded ? 'Yes' : 'No'}`,
    },
    {
      key: 'lgbm',
      title: 'LightGBM Model',
      version: modelInfo?.lgbm_model || 'N/A',
      artifact: modelInfo?.model_artifacts?.lgbm || 'Runtime artifact',
      weight:
        modelInfo?.ensemble_weights && typeof modelInfo.ensemble_weights?.lgbm === 'number'
          ? formatPct(modelInfo.ensemble_weights.lgbm)
          : 'N/A',
      extra: `Feature count: ${modelInfo?.lgbm_features ?? 'N/A'}`,
    },
    {
      key: 'gnn',
      title: 'GNN Model',
      version: modelInfo?.gnn_model || 'N/A',
      artifact: modelInfo?.model_artifacts?.gnn || 'Runtime artifact',
      weight:
        modelInfo?.ensemble_weights && typeof modelInfo.ensemble_weights?.gnn === 'number'
          ? formatPct(modelInfo.ensemble_weights.gnn)
          : 'N/A',
      extra: `SHAP: ${modelInfo?.shap_available ? 'Available' : 'Not available'}`,
    },
  ]

  const metrics = [
    metricTile(
      'Model Accuracy',
      accuracyKpi?.value || formatPctSafe(modelMetrics.accuracy),
      accuracyKpi?.trend || '',
    ),
    metricTile(
      'Latency',
      latencyKpi?.trend || latencyKpi?.value || `${formatNumSafe(modelMetrics.latency_ms, 2, 8)} ms`,
      latencyKpi ? latencyKpi.title : '',
    ),
    metricTile('Precision', formatPctSafe(modelMetrics.precision)),
    metricTile('Recall', formatPctSafe(modelMetrics.recall)),
    metricTile('F1 Score', formatNumSafe(modelMetrics.f1_score)),
    metricTile('AUC', formatNumSafe(modelMetrics.auc)),
    metricTile('GAN Inception Score', formatNumSafe(modelMetrics.inception_score)),
    metricTile('Synthetic Samples', Number(modelMetrics.samples_generated || 0).toLocaleString()),
    metricTile('Accounts Scored', predictionSummary?.total_accounts_scored ?? 0),
    metricTile('Suspicious Accounts', predictionSummary?.suspicious_accounts_count ?? 0),
    metricTile('Suspicious Rate', suspiciousRate),
    metricTile(
      'Risk Distribution',
      `L:${predictionSummary?.low_count ?? 0} | M:${predictionSummary?.medium_count ?? 0} | H:${predictionSummary?.high_count ?? 0} | C:${predictionSummary?.critical_count ?? 0}`,
    ),
    metricTile(
      'Risk Strategy',
      predictionSummary?.risk_bucket_strategy || 'N/A',
      'Bucketing approach',
    ),
    metricTile('Cases Ready', predictionSummary?.cases_ready ? 'Yes' : 'No'),
    metricTile('Parquet Export', predictionSummary?.parquet_written ? 'Yes' : 'No'),
    metricTile('Command Center Version', modelInfo?.command_center_version ?? 1),
    metricTile('GAN Version', modelInfo?.gan_version || 'gan_v1.0'),
    metricTile('Attacker Score', Number(modelInfo?.attacker_score || 0).toFixed(2)),
    metricTile('Defender Score', Number(modelInfo?.defender_score || 0).toFixed(2)),
    metricTile('Resilience Score', Number(modelInfo?.resilience_score || 0).toFixed(2)),
    metricTile('HYDRA Training', modelInfo?.training_status || 'idle'),
    metricTile('Last Prediction Run', formatTimestamp(predictionSummary?.generated_at)),
  ]

  const thresholds = predictionSummary?.risk_thresholds || {}

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {modelCards.map((model) => (
          <GlassCard key={model.key} className={`p-5 border ${modelTone[model.key]?.border || 'border-white/10'} ${modelTone[model.key]?.bg || 'bg-white/5'}`}>
            <p className={`text-xs uppercase tracking-wider ${modelTone[model.key]?.title || 'text-slate-300'}`}>{model.title}</p>
            <p className={`mt-2 text-lg font-semibold ${modelTone[model.key]?.version || 'text-white'}`}>{model.version}</p>
            <div className="mt-3 space-y-1.5 text-sm">
              <p className="text-slate-200">
                <span className="text-slate-400">Artifact:</span>{' '}
                <span className="text-cyan-100">{model.artifact}</span>
              </p>
              <p className="text-slate-200">
                <span className="text-slate-400">Weight:</span>{' '}
                <span className="text-violet-100">{model.weight}</span>
              </p>
              <p className="text-emerald-100">{model.extra}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <h3 className="text-cyan-100 font-semibold">Model Metrics</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
              <p className={`mt-1 text-base font-semibold break-words ${metricToneByLabel[metric.label] || 'text-cyan-100'}`}>
                {metric.value}
              </p>
              {metric.hint ? <p className="mt-1 text-xs text-slate-400">{metric.hint}</p> : null}
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="text-violet-100 font-semibold">Risk Threshold Metrics</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {Object.entries(thresholds).length ? (
            Object.entries(thresholds).map(([key, value], index) => (
              <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{key}</p>
                <p className={`mt-1 text-base font-semibold ${thresholdTone[index % thresholdTone.length]}`}>{String(value)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No threshold metrics available.</p>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
