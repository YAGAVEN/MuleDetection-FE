import { useState, useRef } from 'react'
import { Upload, FileJson, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Download } from 'lucide-react'
import NotificationToast, { notify } from '../shared/NotificationToast.jsx'

export default function SHAPExplainer() {
  const fileInputRef = useRef(null)
  const [jsonFile, setJsonFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shapReport, setShapReport] = useState(null)
  const [accountData, setAccountData] = useState(null)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        setJsonFile(file)
        setAccountData(data)
        notify(`File loaded: ${file.name}`, 'success')
      } catch (err) {
        notify('Invalid JSON file', 'error')
      }
    }
    reader.readAsText(file)
  }

  const generateReport = async () => {
    if (!accountData) {
      notify('Please upload a JSON file first', 'warning')
      return
    }

    setLoading(true)
    try {
      const api = (await import('../../services/api.js')).default
      
      // Prepare the request with account features
      const request = {
        account_id: accountData.account_id || `ACC_${Date.now()}`,
        features: accountData.features || accountData
      }

      const result = await api.generateSHAPExplanation(request)
      setShapReport(result)
      notify('SHAP report generated successfully!', 'success')
    } catch (err) {
      console.error('Error generating report:', err)
      notify(`Error: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadReportJSON = () => {
    if (!shapReport) return
    
    const reportData = {
      account_id: shapReport.account_id,
      prediction_score: shapReport.prediction_score,
      risk_level: shapReport.risk_level,
      base_value: shapReport.base_value,
      model_used: shapReport.model_used,
      explanation_timestamp: shapReport.explanation_timestamp,
      feature_contributions: shapReport.feature_contributions,
      top_positive_features: shapReport.top_positive_features,
      top_negative_features: shapReport.top_negative_features,
      generated_at: new Date().toISOString()
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `SHAP_Report_${shapReport.account_id}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    notify('Report downloaded as JSON!', 'success')
  }

  const downloadReportCSV = () => {
    if (!shapReport) return
    
    let csvContent = 'SHAP Analysis Report\n\n'
    csvContent += `Account ID,${shapReport.account_id}\n`
    csvContent += `Prediction Score,${shapReport.prediction_score?.toFixed(2)}\n`
    csvContent += `Risk Level,${shapReport.risk_level}\n`
    csvContent += `Base Value,${shapReport.base_value?.toFixed(2)}\n`
    csvContent += `Model Used,${shapReport.model_used}\n`
    csvContent += `Generated At,${new Date().toLocaleString()}\n\n`
    
    csvContent += 'Feature Contributions\n'
    csvContent += 'Feature Name,SHAP Value,Base Value,Contribution %\n'
    shapReport.feature_contributions?.forEach(f => {
      csvContent += `"${f.feature_name}",${f.shap_value?.toFixed(4)},${f.base_value?.toFixed(4)},${f.contribution_percentage?.toFixed(2)}\n`
    })
    
    csvContent += '\n\nTop Risk Increasing Features\n'
    csvContent += 'Feature Name,SHAP Value,Contribution %\n'
    shapReport.top_positive_features?.forEach(f => {
      csvContent += `"${f.feature_name}",${f.shap_value?.toFixed(4)},${f.contribution_percentage?.toFixed(2)}\n`
    })
    
    csvContent += '\n\nTop Risk Decreasing Features\n'
    csvContent += 'Feature Name,SHAP Value,Contribution %\n'
    shapReport.top_negative_features?.forEach(f => {
      csvContent += `"${f.feature_name}",${f.shap_value?.toFixed(4)},${f.contribution_percentage?.toFixed(2)}\n`
    })

    const csvBlob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(csvBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `SHAP_Report_${shapReport.account_id}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    notify('Report downloaded as CSV!', 'success')
  }

  const downloadReportTXT = () => {
    if (!shapReport) return
    
    let txtContent = '═════════════════════════════════════════\n'
    txtContent += '          SHAP ANALYSIS REPORT\n'
    txtContent += '═════════════════════════════════════════\n\n'
    
    txtContent += 'ACCOUNT DETAILS\n'
    txtContent += '─────────────────────────────────────────\n'
    txtContent += `Account ID:        ${shapReport.account_id}\n`
    txtContent += `Generated:         ${new Date(shapReport.explanation_timestamp).toLocaleString()}\n`
    txtContent += `Report Created:    ${new Date().toLocaleString()}\n\n`
    
    txtContent += 'PREDICTION METRICS\n'
    txtContent += '─────────────────────────────────────────\n'
    txtContent += `Prediction Score:  ${shapReport.prediction_score?.toFixed(2)}/100\n`
    txtContent += `Risk Level:        ${shapReport.risk_level}\n`
    txtContent += `Base Value:        ${shapReport.base_value?.toFixed(2)}\n`
    txtContent += `Model Used:        ${shapReport.model_used}\n\n`
    
    txtContent += 'TOP RISK INCREASING FEATURES (Contributing to Higher Risk)\n'
    txtContent += '─────────────────────────────────────────\n'
    shapReport.top_positive_features?.forEach((f, i) => {
      txtContent += `${i + 1}. ${f.feature_name}\n`
      txtContent += `   SHAP Value:  ${f.shap_value?.toFixed(4)}\n`
      txtContent += `   Impact:      ${f.contribution_percentage?.toFixed(2)}%\n\n`
    })
    
    txtContent += 'TOP RISK DECREASING FEATURES (Contributing to Lower Risk)\n'
    txtContent += '─────────────────────────────────────────\n'
    shapReport.top_negative_features?.forEach((f, i) => {
      txtContent += `${i + 1}. ${f.feature_name}\n`
      txtContent += `   SHAP Value:  ${f.shap_value?.toFixed(4)}\n`
      txtContent += `   Impact:      ${Math.abs(f.contribution_percentage)?.toFixed(2)}%\n\n`
    })
    
    txtContent += 'ALL FEATURE CONTRIBUTIONS\n'
    txtContent += '─────────────────────────────────────────\n'
    shapReport.feature_contributions?.forEach((f, i) => {
      txtContent += `${i + 1}. ${f.feature_name}: ${f.shap_value?.toFixed(4)} (${f.contribution_percentage?.toFixed(2)}%)\n`
    })
    
    txtContent += '\n═════════════════════════════════════════\n'
    txtContent += 'End of Report\n'
    txtContent += '═════════════════════════════════════════\n'

    const txtBlob = new Blob([txtContent], { type: 'text/plain' })
    const url = URL.createObjectURL(txtBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `SHAP_Report_${shapReport.account_id}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    notify('Report downloaded as TXT!', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-700/20 backdrop-blur-md rounded-2xl p-8 border border-blue-400/30 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <FileJson size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Account Analysis</h3>
            <p className="text-blue-200 text-sm">Upload account JSON data for SHAP analysis</p>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-blue-400/50 rounded-xl p-8 hover:border-blue-300/80 hover:bg-blue-500/5 transition-all cursor-pointer group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="text-center">
            <Upload size={48} className="mx-auto mb-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <p className="text-white font-semibold mb-2">Click to upload or drag and drop</p>
            <p className="text-blue-300 text-sm">JSON file (recommended size: &lt; 5MB)</p>
            {jsonFile && (
              <p className="text-green-400 text-sm mt-3 flex items-center justify-center gap-2">
                <CheckCircle size={16} /> {jsonFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Account Data Preview */}
        {accountData && (
          <div className="mt-6 bg-blue-950/50 rounded-xl p-4 border border-blue-500/20">
            <p className="text-blue-300 text-sm mb-2 font-semibold">Account ID:</p>
            <p className="text-white font-mono text-sm break-all">{accountData.account_id || 'Not specified'}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={!accountData || loading}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/50"
        >
          {loading ? 'Generating Report...' : '🔍 Generate SHAP Report'}
        </button>
      </div>

      {/* SHAP Report Display */}
      {shapReport && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-700/20 backdrop-blur-md rounded-2xl p-6 border border-blue-400/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-950/50 rounded-lg p-4 border border-blue-500/20">
                <p className="text-blue-300 text-sm mb-1">Prediction Score</p>
                <p className="text-3xl font-bold text-blue-200">{shapReport.prediction_score?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-blue-950/50 rounded-lg p-4 border border-blue-500/20">
                <p className="text-blue-300 text-sm mb-1">Risk Level</p>
                <p className={`text-2xl font-bold ${
                  shapReport.risk_level === 'CRITICAL' ? 'text-red-400' :
                  shapReport.risk_level === 'HIGH' ? 'text-orange-400' :
                  shapReport.risk_level === 'MEDIUM' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {shapReport.risk_level}
                </p>
              </div>
              <div className="bg-blue-950/50 rounded-lg p-4 border border-blue-500/20">
                <p className="text-blue-300 text-sm mb-1">Base Value</p>
                <p className="text-2xl font-bold text-blue-200">{shapReport.base_value?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-blue-950/50 rounded-lg p-4 border border-blue-500/20">
                <p className="text-blue-300 text-sm mb-1">Model Used</p>
                <p className="text-lg font-bold text-blue-200">{shapReport.model_used || 'Ensemble'}</p>
              </div>
            </div>
          </div>

          {/* Top Positive Features */}
          {shapReport.top_positive_features && shapReport.top_positive_features.length > 0 && (
            <div className="bg-gradient-to-br from-green-900/30 via-blue-900/20 to-blue-800/20 backdrop-blur-md rounded-2xl p-6 border border-green-400/30">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={24} className="text-green-400" />
                <h4 className="text-xl font-bold text-green-200">Risk Increasing Features</h4>
              </div>
              <div className="space-y-3">
                {shapReport.top_positive_features.map((feature, idx) => (
                  <div key={idx} className="bg-blue-950/40 rounded-lg p-4 border border-green-400/20">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-green-300">{feature.feature_name}</p>
                      <p className="text-green-400 font-bold">{feature.contribution_percentage?.toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-blue-300">
                      <span>SHAP: {feature.shap_value?.toFixed(4)}</span>
                      <span>Base: {feature.base_value?.toFixed(4)}</span>
                    </div>
                    <div className="mt-2 bg-blue-950/50 rounded h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-400 h-full"
                        style={{ width: `${Math.min(feature.contribution_percentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Negative Features */}
          {shapReport.top_negative_features && shapReport.top_negative_features.length > 0 && (
            <div className="bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-700/20 backdrop-blur-md rounded-2xl p-6 border border-blue-400/30">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={24} className="text-blue-400" />
                <h4 className="text-xl font-bold text-blue-200">Risk Decreasing Features</h4>
              </div>
              <div className="space-y-3">
                {shapReport.top_negative_features.map((feature, idx) => (
                  <div key={idx} className="bg-blue-950/40 rounded-lg p-4 border border-blue-400/20">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-blue-300">{feature.feature_name}</p>
                      <p className="text-blue-400 font-bold">{Math.abs(feature.contribution_percentage)?.toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-blue-300">
                      <span>SHAP: {feature.shap_value?.toFixed(4)}</span>
                      <span>Base: {feature.base_value?.toFixed(4)}</span>
                    </div>
                    <div className="mt-2 bg-blue-950/50 rounded h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-full"
                        style={{ width: `${Math.min(Math.abs(feature.contribution_percentage) || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Feature Contributions */}
          {shapReport.feature_contributions && shapReport.feature_contributions.length > 0 && (
            <div className="bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-700/20 backdrop-blur-md rounded-2xl p-6 border border-blue-400/30">
              <h4 className="text-xl font-bold text-blue-200 mb-4">All Feature Contributions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shapReport.feature_contributions.map((feature, idx) => (
                  <div key={idx} className="bg-blue-950/40 rounded-lg p-4 border border-blue-400/20">
                    <p className="font-semibold text-blue-300 mb-2">{feature.feature_name}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-300">
                      <div>
                        <span className="text-blue-400">SHAP:</span>
                        <p className="font-mono text-blue-200">{feature.shap_value?.toFixed(4)}</p>
                      </div>
                      <div>
                        <span className="text-blue-400">Contribution:</span>
                        <p className="font-mono text-blue-200">{feature.contribution_percentage?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp and Download */}
          <div className="bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-700/20 backdrop-blur-md rounded-2xl p-6 border border-blue-400/30">
            <div className="flex items-center justify-between mb-4">
              <p className="text-blue-300 text-sm">
                Report generated: {new Date(shapReport.explanation_timestamp).toLocaleString()}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={downloadReportJSON}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
              >
                <Download size={18} />
                Download JSON
              </button>
              
              <button
                onClick={downloadReportCSV}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
              >
                <Download size={18} />
                Download CSV
              </button>
              
              <button
                onClick={downloadReportTXT}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-cyan-500/50"
              >
                <Download size={18} />
                Download TXT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!shapReport && accountData && !loading && (
        <div className="bg-blue-950/30 border border-blue-400/20 rounded-xl p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-blue-400 opacity-50" />
          <p className="text-blue-300">Click the button above to generate SHAP analysis report</p>
        </div>
      )}
    </div>
  )
}
