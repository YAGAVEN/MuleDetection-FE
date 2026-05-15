import { create } from 'zustand'
import {
  ALERTS,
  CHRONOS_SERIES,
  HYDRA_LOGS,
  KPI_CARDS,
  NETWORK_EDGES,
  NETWORK_NODES,
  PIPELINE_STEPS,
  SAR_QUEUE,
  SYSTEM_HEALTH,
} from '../data/mockMDEData'
import { fetchCases } from '../services/mdeMockService'
import api from '../../../services/api'

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
  kpis: KPI_CARDS,
  pipeline: PIPELINE_STEPS,
  chronosSeries: CHRONOS_SERIES,
  hydraLogs: HYDRA_LOGS,
  sarQueue: SAR_QUEUE,
  alerts: ALERTS,
  systemHealth: SYSTEM_HEALTH,
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
  hydrateCases: async () => {
    const cases = await fetchCases()
    set({ cases })
  },
  syncIngestionStatus: async () => {
    try {
      const status = await api.getIngestionStatus()
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
    
    const statusMap = {
      pending: 'queued',
      running: 'running',
      completed: 'completed',
      failed: 'queued',
    }
    
    const interval = setInterval(async () => {
      try {
        const status = await api.getPipelineStatus()
        if (status) {
          const pipelineSteps = [
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
          set({ pipeline: pipelineSteps })
          
          const allCompleted = pipelineSteps.every((step) => step.status === 'completed')
          if (allCompleted) {
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
      })
      return
    }

    set({
      uploadState: 'uploading',
      uploadProgress: 0,
      uploadSummary: null,
      uploadErrors: [],
      featurePipelineReady: false,
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
      })
    }
  },
}))
