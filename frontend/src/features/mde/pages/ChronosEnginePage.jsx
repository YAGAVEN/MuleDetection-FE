import { useState } from 'react'
import ChronosPreviewPanel from '../components/ChronosPreviewPanel'
import NetworkGraphPreview from '../components/NetworkGraphPreview'
import PageTitle from '../components/PageTitle'
import RiskScoringPanel from '../../../components/Chronos/RiskScoringPanel'
import SHAPModelReportPanel from '../../../components/Chronos/SHAPModelReportPanel'

export default function ChronosEnginePage() {
  const [pipelineStatus, setPipelineStatus] = useState(null)

  const handlePipelineStatusChange = (status) => {
    setPipelineStatus(status)
  }

  return (
    <section className="space-y-4">
      <PageTitle
        title="CHRONOS Intelligence"
        subtitle="Replay laundering movement over time and inspect suspicious graph clusters."
      />
      
      {/* Risk Scoring Pipeline */}
      <RiskScoringPanel 
        onPipelineStatusChange={handlePipelineStatusChange}
      />

      {/* SHAP Model Report - Suspicious Accounts Analysis */}
      <SHAPModelReportPanel 
        pipelineStatus={pipelineStatus}
      />

      {/* Visualizations */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <ChronosPreviewPanel />
        <NetworkGraphPreview />
      </div>
    </section>
  )
}
