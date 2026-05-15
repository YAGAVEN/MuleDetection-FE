import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/shared/ScrollToTop.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MDELayout from './features/mde/MDELayout'
import DashboardPage from './features/mde/pages/DashboardPage'
import IngestionPage from './features/mde/pages/IngestionPage'
import CasesPage from './features/mde/pages/CasesPage'
import ChronosEnginePage from './features/mde/pages/ChronosEnginePage'
import AutoSARPage from './features/mde/pages/AutoSARPage'
import HydraLabPage from './features/mde/pages/HydraLabPage'
import ModelsPage from './features/mde/pages/ModelsPage'
import ReportsPage from './features/mde/pages/ReportsPage'
import SettingsPage from './features/mde/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mde" element={<MDELayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="ingestion" element={<IngestionPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="chronos" element={<ChronosEnginePage />} />
          <Route path="autosar" element={<AutoSARPage />} />
          <Route path="hydra" element={<HydraLabPage />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/mule" element={<Navigate to="/mde/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
