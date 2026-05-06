/**
 * BattleMetrics – real-time counter cards for the HYDRA battle.
 */
import { Icon } from '../Icons/IconSystem'

export default function BattleMetrics({ metrics }) {
  const { defenderWins = 0, attackerWins = 0, totalBattles = 0, detectionRate = 0 } = metrics

  return (
    <div className="bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
      <h3 className="text-xl font-semibold mb-4 text-red-500 flex items-center gap-2">
        <Icon name="BarChart3" size={24} />
        <span>Battle Metrics</span>
      </h3>
      <div className="space-y-4">
        <MetricRow label="Battles Won (Defender):" value={defenderWins} color="text-[#00d4ff]" />
        <MetricRow label="Battles Won (Attacker):" value={attackerWins} color="text-red-400" />
        <MetricRow label="Detection Rate:" value={`${detectionRate}%`} color="text-[#00ff87]" />
        <MetricRow label="Total Battles:" value={totalBattles} color="text-white" />
      </div>
    </div>
  )
}

function MetricRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-300">{label}</span>
      <span className={`${color} font-bold text-xl`}>{value}</span>
    </div>
  )
}
