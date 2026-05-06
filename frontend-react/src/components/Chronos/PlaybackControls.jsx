/**
 * PlaybackControls – timeline speed + play/pause/reset buttons.
 */
export default function PlaybackControls({ speed, onSpeedChange, onPlay, onPause, onReset }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">Playback</label>
      <div className="flex space-x-2 mb-2">
        <button
          onClick={onPlay}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          ▶️ Play
        </button>
        <button
          onClick={onPause}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
        >
          ⏸️ Pause
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          🔄 Reset
        </button>
      </div>
      <div className="space-y-1">
        <label className="block text-xs text-gray-400">
          Speed: <span>{speed}x</span>
        </label>
        <input
          type="range"
          min="0.25"
          max="4"
          step="0.25"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.25x</span>
          <span>1x</span>
          <span>4x</span>
        </div>
      </div>
    </div>
  )
}
