import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ScrollToTop from './components/shared/ScrollToTop.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ChronosPage from './pages/ChronosPage.jsx'
import AutoSARPage from './pages/AutoSARPage.jsx'
import HydraPage from './pages/HydraPage.jsx'
import MulePage from './pages/MulePage.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/chronos" element={<ProtectedRoute><ChronosPage /></ProtectedRoute>} />
          <Route path="/autosar" element={<ProtectedRoute><AutoSARPage /></ProtectedRoute>} />
          <Route path="/hydra" element={<ProtectedRoute><HydraPage /></ProtectedRoute>} />
          <Route path="/mule" element={<ProtectedRoute><MulePage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/chronos" replace />} />
          <Route path="*" element={<Navigate to="/chronos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
