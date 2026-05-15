import GlassCard from '../components/GlassCard'
import PageTitle from '../components/PageTitle'

const settingRows = [
  ['Real-time alert threshold', '85 / 100'],
  ['Auto-escalation mode', 'Enabled'],
  ['SAR auto-generate on critical', 'Enabled'],
  ['HYDRA retraining cadence', 'Every 6 hours'],
]

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="Settings"
        subtitle="Operational preferences for MDE orchestration and AML automation."
      />
      <GlassCard className="p-5">
        <div className="space-y-3">
          {settingRows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-3">
              <span className="text-sm text-slate-300">{label}</span>
              <span className="text-sm text-cyan-200">{value}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  )
}
