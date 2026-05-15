export default function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}
