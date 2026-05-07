/**
 * AIInsightsPanel – shows AI insight cards and a Generate button.
 */
export default function AIInsightsPanel({ insights, loading, onGenerate }) {
  return (
    <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-[#00ff87]/20">
      <h3 className="text-2xl font-semibold mb-6 text-[#00ff87] flex items-center">
        🤖 AI Insights{' '}
        <span className="ml-3 text-sm bg-[#00ff87]/20 text-[#00ff87] px-3 py-1 rounded-full">
          Advanced Analysis
        </span>
      </h3>

      <div id="ai-insights" className="space-y-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-600 rounded w-3/4" />
            <div className="h-6 bg-gray-600 rounded w-1/2" />
          </div>
        ) : insights.length > 0 ? (
          insights.map((insight, i) => (
            <div
              key={i}
              className="bg-[#0a0a0f]/40 rounded-xl p-4 border border-[#00ff87]/10"
              dangerouslySetInnerHTML={{ __html: insight }}
            />
          ))
        ) : (
          <div className="text-gray-400 text-center py-6">
            Click "Generate AI Insights" to analyse transaction patterns.
          </div>
        )}
      </div>

      <button
        onClick={onGenerate}
        className="mt-6 px-8 py-3 bg-gradient-to-r from-[#00ff87] to-[#00d4ff] text-[#0a0a0f] font-bold rounded-xl hover:shadow-lg transition-all text-lg"
      >
        Generate AI Insights
      </button>
    </div>
  )
}
