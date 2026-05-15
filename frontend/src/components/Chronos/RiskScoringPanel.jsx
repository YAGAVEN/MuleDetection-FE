/**
 * RiskScoringPanel – Upload files, trigger pipeline, display risk scores
 */
import { useRef, useState } from 'react'
import { notify } from '../shared/NotificationToast'

export default function RiskScoringPanel({ onRiskScoresLoaded, onPipelineStatusChange, loading, pipelineStatus }) {
  const masterFileRef = useRef(null)
  const transactionsFileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [processingStage, setProcessingStage] = useState(null)

  const handleMasterClick = () => masterFileRef.current?.click()
  const handleTransactionsClick = () => transactionsFileRef.current?.click()

  const handleUpload = async (event, fileType) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      notify('Please upload a CSV file', 'error')
      return
    }

    // Check if other file is also selected
    const masterFile = masterFileRef.current?.files?.[0]
    const txnFile = transactionsFileRef.current?.files?.[0]

    if (masterFile && txnFile) {
      handleUploadBothFiles(masterFile, txnFile)
    }
  }

  const handleUploadBothFiles = async (masterFile, txnFile) => {
    setUploading(true)
    setProcessingStage('Uploading files...')
    try {
      const formData = new FormData()
      formData.append('files', masterFile)
      formData.append('files', txnFile)

      // Upload both files to ingestion endpoint
      const uploadResponse = await fetch('http://localhost:8000/api/ingestion/upload', {
        method: 'POST',
        body: formData
      })

      const uploadData = await uploadResponse.json()

      if (uploadData.status !== 'success') {
        notify('Upload failed', 'error')
        setUploading(false)
        return
      }

      notify('Files uploaded successfully!', 'success')
      setProcessingStage('Starting pipeline...')

      // Wait a moment for backend to process
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Start the ML pipeline
      const pipelineResponse = await fetch('http://localhost:8000/api/pipeline/start', {
        method: 'POST'
      })

      if (!pipelineResponse.ok) {
        throw new Error('Failed to start pipeline')
      }

      notify('Pipeline started! Processing...', 'success')
      setProcessingStage('Pipeline running...')

      // Poll pipeline status
      let isComplete = false
      let attempts = 0
      const maxAttempts = 60 // 5 minutes with 5-second intervals

      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000))

        const statusResponse = await fetch('http://localhost:8000/api/pipeline/status')
        const statusData = await statusResponse.json()

        // Pass status to parent component
        if (onPipelineStatusChange) {
          onPipelineStatusChange(statusData)
        }

        if (statusData.is_running === false && statusData.prediction_engine?.status === 'completed') {
          isComplete = true
          setProcessingStage('Pipeline completed!')
          notify('Pipeline complete! Loading risk scores...', 'success')

          // Fetch risk scores
          const riskResponse = await fetch('http://localhost:8000/api/chronos/accounts-with-risk-scores')
          const riskData = await riskResponse.json()

          if (riskData.status === 'success') {
            onRiskScoresLoaded(riskData.accounts)
            notify(`Loaded risk scores for ${riskData.total_accounts} accounts!`, 'success')
            setProcessingStage(null)
          }
        }

        attempts++
      }

      if (!isComplete) {
        throw new Error('Pipeline took too long to complete')
      }
    } catch (error) {
      notify(`Error: ${error.message}`, 'error')
      console.error(error)
      setProcessingStage(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-[#00ff87]/20">
      <h3 className="text-2xl font-semibold mb-6 text-[#00ff87] flex items-center">
        🎯 Risk Scoring Pipeline
        <span className="ml-3 text-sm bg-[#00ff87]/20 text-[#00ff87] px-3 py-1 rounded-full">
          {uploading ? 'Processing...' : 'Ready'}
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Master CSV Upload */}
        <div
          onClick={handleMasterClick}
          className="bg-[#0a0a0f]/40 rounded-xl p-6 border-2 border-dashed border-[#00d4ff]/30 hover:border-[#00d4ff] cursor-pointer transition-all"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold text-white mb-1">Master Data</div>
            <div className="text-sm text-gray-400">
              {masterFileRef.current?.files?.[0]?.name || 'Click to upload master.csv'}
            </div>
          </div>
          <input
            ref={masterFileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e, 'master')}
          />
        </div>

        {/* Transactions CSV Upload */}
        <div
          onClick={handleTransactionsClick}
          className="bg-[#0a0a0f]/40 rounded-xl p-6 border-2 border-dashed border-[#FF3333]/30 hover:border-[#FF3333] cursor-pointer transition-all"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">💳</div>
            <div className="font-semibold text-white mb-1">Transactions</div>
            <div className="text-sm text-gray-400">
              {transactionsFileRef.current?.files?.[0]?.name || 'Click to upload transactions.csv'}
            </div>
          </div>
          <input
            ref={transactionsFileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e, 'transactions')}
          />
        </div>
      </div>

      {/* Status Display */}
      {processingStage && (
        <div className="bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin text-[#00ff87]">⚙️</div>
            <div className="text-white font-medium">{processingStage}</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-[#0a0a0f]/40 rounded-xl p-4 border border-white/10">
        <div className="text-sm text-gray-300 space-y-2">
          <div className="flex items-start">
            <span className="text-[#00ff87] mr-3 font-bold">1.</span>
            <span>Select both master.csv and transactions.csv files</span>
          </div>
          <div className="flex items-start">
            <span className="text-[#00ff87] mr-3 font-bold">2.</span>
            <span>Pipeline runs: Feature Extraction → GNN Prediction</span>
          </div>
          <div className="flex items-start">
            <span className="text-[#00ff87] mr-3 font-bold">3.</span>
            <span>Risk scores generated and accounts highlighted in Chronos</span>
          </div>
        </div>
      </div>
    </div>
  )
}
