import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, CloudUpload, Link2, PlayCircle, Server, Zap } from 'lucide-react'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const statusTone = {
  completed: 'bg-emerald-500/15 border-emerald-300/30 text-emerald-200',
  running: 'bg-cyan-500/15 border-cyan-300/30 text-cyan-200 animate-pulse',
  queued: 'bg-slate-500/20 border-slate-300/20 text-slate-300',
}

const stageMessages = {
  ingestion: 'Data validation and storage',
  featureEngineering: 'Extracting AML intelligence features...',
  modelScoring: 'Running AI-based mule detection models...',
  caseGeneration: 'Generating investigation cases...',
}

const AnimatedDot = ({ delay = 0 }) => (
  <motion.div
    animate={{ opacity: [0.3, 1, 0.3] }}
    transition={{ duration: 1.5, repeat: Infinity, delay }}
    className="w-1.5 h-1.5 rounded-full bg-cyan-400"
  />
)

export default function DataIngestionPanel() {
  const runUpload = useMDEStore((s) => s.runUpload)
  const syncIngestionStatus = useMDEStore((s) => s.syncIngestionStatus)
  const uploadProgress = useMDEStore((s) => s.uploadProgress)
  const uploadState = useMDEStore((s) => s.uploadState)
  const uploadSummary = useMDEStore((s) => s.uploadSummary)
  const uploadErrors = useMDEStore((s) => s.uploadErrors)
  const featurePipelineReady = useMDEStore((s) => s.featurePipelineReady)
  const pipeline = useMDEStore((s) => s.pipeline)
  const fileInputRef = useRef(null)

  useEffect(() => {
    syncIngestionStatus()
  }, [syncIngestionStatus])

  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    runUpload(files)
    event.target.value = ''
  }

  const uploadStatusText =
    uploadState === 'uploading'
      ? 'Uploading files…'
      : uploadState === 'validating'
      ? 'Validating uploaded data…'
      : uploadState === 'accepted'
      ? 'Accepted'
      : uploadState === 'rejected'
      ? 'Rejected'
      : 'Awaiting upload'

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Data Ingestion & Pipeline</h2>
        <div className="text-xs text-cyan-200 bg-cyan-500/10 border border-cyan-300/30 px-3 py-1 rounded-lg">
          Stream Health: Stable
        </div>
      </div>

      {/* Pipeline Progress Indicator */}
      {featurePipelineReady && (
        <div className="mb-4 p-3 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 rounded-lg border border-cyan-300/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-cyan-200">Pipeline Progress</p>
            <p className="text-xs text-slate-400">
              {pipeline.filter((s) => s.status === 'completed').length}/4 stages complete
            </p>
          </div>
          <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
            <motion.div
              animate={{
                width: `${(pipeline.filter((s) => s.status === 'completed').length / 4) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-cyan-400"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-xl border border-dashed border-cyan-300/35 bg-cyan-500/5 p-4">
          <p className="text-xs uppercase tracking-widest text-cyan-300 mb-3">CSV Upload</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv"
            className="hidden"
            onChange={handleFileSelection}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 rounded-xl border border-cyan-300/35 bg-slate-900/40 text-cyan-100 flex flex-col items-center justify-center gap-2 hover:bg-cyan-500/10"
          >
            <CloudUpload size={18} />
            <span className="text-sm">Select master.csv + transactions_full.csv</span>
          </button>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-2">
              {(uploadState === 'accepted' || featurePipelineReady) ? <CheckCircle2 size={12} className="text-emerald-300" /> : null}
              {uploadState === 'rejected' ? <AlertCircle size={12} className="text-rose-300" /> : null}
              <span>{uploadStatusText}</span>
            </p>
            {featurePipelineReady && (
              <p className="mt-1 text-xs text-emerald-300">Feature Pipeline Ready</p>
            )}
            {uploadSummary?.files?.['master.csv'] && (
              <p className="mt-1 text-xs text-cyan-200">
                master.csv: {uploadSummary.files['master.csv'].rows} rows ·
                {' '}transactions_full.csv: {uploadSummary.files['transactions_full.csv'].rows} rows
              </p>
            )}
            {uploadErrors.length > 0 && (
              <div className="mt-2 rounded-lg border border-rose-300/25 bg-rose-500/10 p-2">
                {uploadErrors.slice(0, 3).map((error, idx) => (
                  <p key={`${error.file}-${error.column}-${idx}`} className="text-[11px] text-rose-200">
                    {error.file} / {error.column}: {error.issue}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-violet-300 mb-3">API Integration</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Connection</span>
              <span className="text-emerald-200 flex items-center gap-1"><CheckCircle2 size={14} /> Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Endpoint</span>
              <span className="text-cyan-200">/api/ingestion/upload</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Stream Monitor</span>
              <span className="text-violet-200 flex items-center gap-1"><PlayCircle size={14} /> 4,128 msg/min</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-cyan-300 mb-3">Pipeline Status</p>
          <div className="space-y-2">
            {pipeline.map((step, idx) => (
              <div key={step.key}>
                <div className={`rounded-lg border p-2 text-xs flex items-center justify-between ${statusTone[step.status]}`}>
                  <span className="flex items-center gap-2">
                    {step.status === 'running' ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                        <Zap size={12} className="text-cyan-400" />
                      </motion.div>
                    ) : step.status === 'completed' ? (
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-slate-400" />
                    )}
                    {step.label}
                  </span>
                  <span className="uppercase tracking-wider">{step.status}</span>
                </div>
                {step.status === 'running' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-1 px-2 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-300/20"
                  >
                    <p className="text-[10px] text-cyan-300 flex items-center gap-1.5">
                      <span className="flex gap-1">
                        <AnimatedDot delay={0} />
                        <AnimatedDot delay={0.3} />
                        <AnimatedDot delay={0.6} />
                      </span>
                      {stageMessages[step.key] || 'Processing...'}
                    </p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
