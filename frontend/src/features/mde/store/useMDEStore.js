import { create } from 'zustand'
import {
  CHRONOS_SERIES,
  HYDRA_LOGS,
  NETWORK_EDGES,
  NETWORK_NODES,
  PIPELINE_STEPS,
  SAR_QUEUE,
} from '../data/mockMDEData'
import api from '../../../services/api'

const statusMap = {
  pending: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
}

const toPipelineSteps = (status = {}) => [
  {
    key: 'ingestion',
    label: 'Ingestion',
    status: statusMap[status.ingestion || 'pending'],
  },
  {
    key: 'featureEngineering',
    label: 'Feature Engineering',
    status: statusMap[status.feature_extraction || 'pending'],
  },
  {
    key: 'modelScoring',
    label: 'Model Scoring',
    status: statusMap[status.prediction_engine || 'pending'],
  },
  {
    key: 'caseGeneration',
    label: 'Case Generation',
    status: statusMap[status.case_generation || 'pending'],
  },
]

const normalizeCases = (results) => {
  if (Array.isArray(results?.investigation_cases)) {
    return results.investigation_cases
  }
  if (Array.isArray(results?.investigation_cases?.cases)) {
    return results.investigation_cases.cases
  }
  return null
}

const normalizeAlerts = (results) => {
  if (Array.isArray(results?.alerts)) {
    return results.alerts
  }
  if (Array.isArray(results?.alerts?.alerts)) {
    return results.alerts.alerts
  }
  return null
}

const normalizePredictionSummary = (results) => {
  if (results?.prediction_summary && typeof results.prediction_summary === 'object') {
    return results.prediction_summary
  }
  return null
}

const normalizeRiskScores = (results) => {
  if (Array.isArray(results?.risk_scores)) {
    return results.risk_scores
  }
  if (Array.isArray(results?.risk_scores?.scores)) {
    return results.risk_scores.scores
  }
  return null
}

const normalizeSuspiciousAccounts = (results) => {
  if (Array.isArray(results?.suspicious_accounts)) {
    return results.suspicious_accounts
  }
  if (Array.isArray(results?.suspicious_accounts?.accounts)) {
    return results.suspicious_accounts.accounts
  }
  return null
}

const normalizeSystemHealth = (results) => {
  if (Array.isArray(results?.system_health)) {
    return results.system_health
  }
  return null
}

const normalizeKpis = (results) => {
  if (Array.isArray(results?.kpis)) {
    return results.kpis
  }
  return null
}

const normalizeModelInfo = (results) => {
  if (results?.model_info && typeof results.model_info === 'object') {
    return results.model_info
  }
  if (results && typeof results === 'object' && results.ensemble_model) {
    return results
  }
  if (results?.model_versions && typeof results.model_versions === 'object') {
    return {
      ensemble_model: results.model_versions.ensemble || 'N/A',
      lgbm_model: results.model_versions.lgbm || 'N/A',
      gnn_model: results.model_versions.gnn || 'N/A',
      shap_model: results.model_versions.shap || 'N/A',
      model_artifacts: results.model_artifacts || {},
      ensemble_weights: results.ensemble_weights || {},
      shap_available: true,
      loaded: true,
      metrics: results.metrics || {},
      command_center_version: results.version ?? 1,
      gan_version: results.model_versions.gan || 'gan_v1.0',
      attacker_score: results.attacker_score ?? 0,
      defender_score: results.defender_score ?? 0,
      resilience_score: results.resilience_score ?? 0,
      training_status: results.training_status || 'idle',
    }
  }
  return null
}

export const useMDEStore = create((set, get) => ({
  sidebarCollapsed: false,
  query: '',
  riskLevel: 'All',
  sortField: 'riskScore',
  sortDirection: 'desc',
  page: 1,
  pageSize: 4,
  expandedRows: [],
  uploadProgress: 0,
  uploadState: 'idle',
  uploadSummary: null,
  uploadErrors: [],
  featurePipelineReady: false,
  chronosPlaying: true,
  cases: [],
  kpis: [],
  pipeline: PIPELINE_STEPS,
  pipelineMessage: '',
  chronosSeries: CHRONOS_SERIES,
  hydraLogs: HYDRA_LOGS,
  hydraBattle: {
    training_status: 'idle',
    attacker_score: 0,
    defender_score: 0,
    resilience_score: 0,
    active_attack_type: 'none',
    gnn_status: 'stable',
    ensemble_status: 'stable',
    synthetic_patterns_generated: 0,
    detected_patterns: 0,
    round: 0,
    is_running: false,
  },
  hydraEventSource: null,
  sarQueue: SAR_QUEUE,
  alerts: [],
  predictionSummary: null,
  previousPredictionSummary: null,
  modelInfo: null,
  riskScores: [],
  suspiciousAccounts: [],
  dashboardStatus: 'unknown',
  dashboardStatusMessage: 'Connecting to backend...',
  systemHealth: [],
  networkNodes: NETWORK_NODES,
  networkEdges: NETWORK_EDGES,
  pipelinePollInterval: null,

  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  setQuery: (value) => set({ query: value, page: 1 }),
  setRiskLevel: (value) => set({ riskLevel: value, page: 1 }),
  setPage: (value) => set({ page: value }),
  toggleChronos: () => set((state) => ({ chronosPlaying: !state.chronosPlaying })),
  toggleRow: (id) =>
    set((state) => ({
      expandedRows: state.expandedRows.includes(id)
        ? state.expandedRows.filter((rowId) => rowId !== id)
        : [...state.expandedRows, id],
    })),
  setSort: (field) =>
    set((state) => ({
      sortField: field,
      sortDirection:
        state.sortField === field && state.sortDirection === 'desc' ? 'asc' : 'desc',
    })),
  appendHydraLog: (line) =>
    set((state) => ({
      hydraLogs: [line, ...state.hydraLogs].slice(0, 120),
    })),
  syncHydraBattleStatus: async () => {
    try {
      const response = await api.getHydraBattleStatus()
      if (response?.battle) {
        set({ hydraBattle: response.battle })
      }
    } catch {
      // Keep existing hydra status when backend is unavailable.
    }
  },
  startHydraBattle: async (rounds = 20, intervalSeconds = 2) => {
    try {
      const response = await api.startHydraBattle(rounds, intervalSeconds)
      if (response?.battle) {
        set({ hydraBattle: response.battle })
      }
      await get().connectHydraEvents()
    } catch (error) {
      get().appendHydraLog(
        `[${new Date().toLocaleTimeString()}] Failed to start HYDRA battle: ${error?.message || 'Unknown error'}`,
      )
      set((state) => ({
        hydraBattle: {
          ...state.hydraBattle,
          training_status: 'failed',
          is_running: false,
        },
      }))
    }
  },
  stopHydraBattle: async () => {
    try {
      const response = await api.stopHydraBattle()
      if (response?.battle) {
        set({ hydraBattle: response.battle })
      }
    } catch {
      // Keep existing state.
    } finally {
      get().disconnectHydraEvents()
    }
  },
  connectHydraEvents: async () => {
    const existing = get().hydraEventSource
    if (existing) {
      return
    }
    if (typeof window === 'undefined') {
      return
    }
    const baseURL = api.baseURL
    const source = new EventSource(`${baseURL}/hydra/battle/events`)
    source.addEventListener('hydra', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}')
        if (payload?.message) {
          get().appendHydraLog(`[${new Date().toLocaleTimeString()}] ${payload.message}`)
        }
      } catch {
        // Ignore malformed events.
      }
    })
    source.addEventListener('heartbeat', () => {
      get().syncHydraBattleStatus()
    })
    source.onerror = () => {
      get().disconnectHydraEvents()
    }
    set({ hydraEventSource: source })
  },
  disconnectHydraEvents: () => {
    const source = get().hydraEventSource
    if (source) {
      source.close()
    }
    set({ hydraEventSource: null })
  },
  hydrateCases: async () => {
    await get().syncPipelineResults()
  },
  syncDashboard: async () => {
    try {
      const dashboard = await api.getDashboardSummary()
      const nextState = {
        dashboardStatus: 'online',
        dashboardStatusMessage: 'Live runtime data',
      }

      const kpis = normalizeKpis(dashboard)
      if (kpis) {
        nextState.kpis = kpis
      }

      const health = normalizeSystemHealth(dashboard)
      if (health) {
        nextState.systemHealth = health
      }

      const alerts = normalizeAlerts(dashboard)
      if (alerts) {
        nextState.alerts = alerts
      }

      const cases = normalizeCases(dashboard)
      if (cases) {
        nextState.cases = cases
      }

      const riskScores = normalizeRiskScores(dashboard)
      if (riskScores) {
        nextState.riskScores = riskScores
      }

      const suspiciousAccounts = normalizeSuspiciousAccounts(dashboard)
      if (suspiciousAccounts) {
        nextState.suspiciousAccounts = suspiciousAccounts
      }

      const predictionSummary = normalizePredictionSummary(dashboard)
      if (predictionSummary) {
        nextState.predictionSummary = predictionSummary
      }

      const modelInfo = normalizeModelInfo(dashboard)
      if (modelInfo) {
        nextState.modelInfo = modelInfo
      }

      set(nextState)
    } catch {
      set({
        kpis: [],
        alerts: [],
        systemHealth: [],
        dashboardStatus: 'offline',
        dashboardStatusMessage: 'Backend offline',
      })
    }
  },
  syncModelInfo: async () => {
    try {
      const modelInfoPayload = await api.getModelInfo()
      const modelInfo = normalizeModelInfo(modelInfoPayload)
      const nextState = {}
      if (modelInfo) {
        nextState.modelInfo = {
          ...modelInfo,
          metrics: modelInfo?.metrics || modelInfoPayload?.metrics || {},
          command_center_version:
            modelInfo?.command_center_version ?? modelInfoPayload?.version ?? 1,
          gan_version: modelInfo?.gan_version || modelInfoPayload?.model_versions?.gan || 'gan_v1.0',
        }
      }
      const predictionSummary = normalizePredictionSummary(modelInfoPayload)
      if (predictionSummary) {
        nextState.predictionSummary = predictionSummary
      }
      if (Object.keys(nextState).length > 0) {
        set(nextState)
      }
    } catch {
      // Keep current state when model-info endpoint is unavailable.
    }
  },
  syncPipelineResults: async () => {
    try {
      const results = await api.getPipelineResults()
      const nextState = {}
      const cases = normalizeCases(results)
      if (cases) {
        nextState.cases = cases
      }
      const alerts = normalizeAlerts(results)
      if (alerts) {
        nextState.alerts = alerts
      }
      const riskScores = normalizeRiskScores(results)
      if (riskScores) {
        nextState.riskScores = riskScores
      }
      const suspiciousAccounts = normalizeSuspiciousAccounts(results)
      if (suspiciousAccounts) {
        nextState.suspiciousAccounts = suspiciousAccounts
      }
      const predictionSummary = normalizePredictionSummary(results)
      if (predictionSummary) {
        const current = get().predictionSummary
        let previous = get().previousPredictionSummary

        if (
          current?.generated_at &&
          predictionSummary?.generated_at &&
          current.generated_at !== predictionSummary.generated_at
        ) {
          previous = current
        }

        if (typeof window !== 'undefined') {
          try {
            const cached = window.localStorage.getItem('mde:last_prediction_summary')
            if (!previous && cached) {
              const parsed = JSON.parse(cached)
              if (
                parsed?.generated_at &&
                parsed.generated_at !== predictionSummary.generated_at
              ) {
                previous = parsed
              }
            }
            window.localStorage.setItem(
              'mde:last_prediction_summary',
              JSON.stringify(predictionSummary),
            )
          } catch {
            // Ignore localStorage errors and continue using in-memory trend state.
          }
        }

        nextState.predictionSummary = predictionSummary
        if (previous) {
          nextState.previousPredictionSummary = previous
        }
      }
      if (Object.keys(nextState).length > 0) {
        set(nextState)
      }
    } catch {
      // Keep current state when temp-data results are not available.
    }
  },
  syncIngestionStatus: async () => {
    try {
      const status = await api.getIngestionStatus()
      await get().syncPipelineResults()
      set({
        featurePipelineReady: !!status?.feature_pipeline_ready,
      })
    } catch {
      set({ featurePipelineReady: false })
    }
  },
  startPipelinePolling: () => {
    const state = get()
    if (state.pipelinePollInterval) {
      clearInterval(state.pipelinePollInterval)
    }

    const interval = setInterval(async () => {
      try {
        const status = await api.getPipelineStatus()
        if (status) {
          const pipelineSteps = toPipelineSteps(status)
          set({
            pipeline: pipelineSteps,
            pipelineMessage: status.message || '',
            featurePipelineReady: status.ingestion === 'completed',
          })

          await get().syncPipelineResults()

          const allCompleted = pipelineSteps.every((step) => step.status === 'completed')
          const hasFailed = pipelineSteps.some((step) => step.status === 'failed')
          if (allCompleted || hasFailed) {
            clearInterval(interval)
            set({ pipelinePollInterval: null })
          }
        }
      } catch (error) {
        console.error('Failed to poll pipeline status:', error)
      }
    }, 1500)
    
    set({ pipelinePollInterval: interval })
  },
  stopPipelinePolling: () => {
    const state = get()
    if (state.pipelinePollInterval) {
      clearInterval(state.pipelinePollInterval)
      set({ pipelinePollInterval: null })
    }
  },
  runUpload: async (files) => {
    get().stopPipelinePolling()
    const fileNames = files.map((f) => f.name)
    const required = ['master.csv', 'transactions_full.csv']
    const validSelection =
      files.length === 2 && required.every((name) => fileNames.includes(name))

    if (!validSelection) {
      set({
        uploadState: 'rejected',
        uploadProgress: 0,
        uploadSummary: null,
        uploadErrors: [
          {
            file: '__request__',
            column: '__files__',
            issue: 'Select exactly two files: master.csv and transactions_full.csv',
          },
        ],
        featurePipelineReady: false,
        pipeline: PIPELINE_STEPS,
        pipelineMessage: '',
      })
      return
    }

    set({
      uploadState: 'uploading',
      uploadProgress: 0,
      uploadSummary: null,
      uploadErrors: [],
      featurePipelineReady: false,
      pipeline: PIPELINE_STEPS,
      pipelineMessage: '',
    })

    try {
      const response = await api.uploadIngestion(files, (progress) =>
        set({
          uploadProgress: progress,
          uploadState: progress >= 100 ? 'validating' : 'uploading',
        }),
      )

      set({
        uploadState: 'accepted',
        uploadProgress: 100,
        uploadSummary: response,
        uploadErrors: [],
        featurePipelineReady: !!response?.feature_pipeline_ready,
      })

      get().startPipelinePolling()
    } catch (error) {
      const details = error?.details || {}
      const parsedErrors = details?.errors || []
      set({
        uploadState: 'rejected',
        uploadSummary: null,
        uploadErrors:
          parsedErrors.length > 0
            ? parsedErrors
            : [
                {
                  file: '__request__',
                  column: '__upload__',
                  issue: error?.message || 'Upload failed',
                },
              ],
        featurePipelineReady: false,
        pipelineMessage: '',
      })
    }
  },
}))
