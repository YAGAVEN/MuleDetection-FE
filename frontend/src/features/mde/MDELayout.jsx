import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import MDEHeader from './components/MDEHeader'
import MDESidebar from './components/MDESidebar'
import { useMDEStore } from './store/useMDEStore'

export default function MDELayout() {
  const hydrateCases = useMDEStore((s) => s.hydrateCases)

  useEffect(() => {
    hydrateCases()
  }, [hydrateCases])

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.12),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative flex">
        <MDESidebar />
        <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-5 min-w-0">
          <MDEHeader />
          <div className="min-h-[calc(100vh-9rem)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
