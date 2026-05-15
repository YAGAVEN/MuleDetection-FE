import {
  LayoutDashboard,
  Database,
  BriefcaseBusiness,
  Orbit,
  FileText,
  FlaskConical,
  BrainCircuit,
  BarChart3,
  Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/mde/dashboard' },
  { id: 'ingestion', label: 'Data Ingestion', icon: Database, path: '/mde/ingestion' },
  { id: 'cases', label: 'Cases', icon: BriefcaseBusiness, path: '/mde/cases' },
  { id: 'chronos', label: 'CHRONOS', icon: Orbit, path: '/mde/chronos' },
  { id: 'autosar', label: 'Auto-SAR', icon: FileText, path: '/mde/autosar' },
  { id: 'hydra', label: 'HYDRA Lab', icon: FlaskConical, path: '/mde/hydra' },
  { id: 'models', label: 'Models', icon: BrainCircuit, path: '/mde/models' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/mde/reports' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/mde/settings' },
]
