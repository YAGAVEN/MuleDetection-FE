/**
 * ProgressFlow – shows the 4-step workflow status bar used on every page.
 * activeStep: 'chronos' | 'autosar' | 'hydra' | 'mule'
 */
const STEPS = [
  { id: 'chronos', label: 'CHRONOS', color: 'bg-[#00ff87]', textColor: 'text-[#00ff87]' },
  { id: 'autosar', label: 'Auto-SAR', color: 'bg-orange-500', textColor: 'text-orange-500' },
  { id: 'hydra', label: 'HYDRA', color: 'bg-red-500', textColor: 'text-red-500' },
  { id: 'mule', label: 'Mule', color: 'bg-purple-500', textColor: 'text-purple-400' },
]

export default function ProgressFlow({ activeStep }) {
  return (
    <div className="flex justify-center items-center space-x-4 mb-8">
      {STEPS.map((step, idx) => {
        const isActive = step.id === activeStep
        return (
          <div key={step.id} className="flex items-center">
            {idx > 0 && <div className="w-8 h-px bg-gray-600 mr-4" />}
            <div className={`flex items-center ${isActive ? '' : 'opacity-50'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${isActive ? `${step.color} text-[#0a0a0f]` : 'bg-gray-600 text-gray-400'}`}
              >
                {idx + 1}
              </div>
              <span className={`ml-2 font-semibold text-sm ${isActive ? step.textColor : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
