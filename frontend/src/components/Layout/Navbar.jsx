import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Icon } from '../Icons/IconSystem'

const NAV_ITEMS = [
  { path: '/chronos', label: 'CHRONOS', icon: 'Clock', color: 'text-[#00ff87] border-[#00ff87]' },
  { path: '/autosar', label: 'Auto-SAR', icon: 'FileText', color: 'text-orange-400 border-orange-400' },
  { path: '/hydra', label: 'HYDRA', icon: 'Shield', color: 'text-red-400 border-red-400' },
  { path: '/mule', label: 'Mule', icon: 'Users', color: 'text-purple-400 border-purple-400' },
]

export default function Navbar({ pageTitle, pageTitleColor = 'text-[#00ff87]', pageIcon }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-[#1a1a2e]/80 backdrop-blur-sm border-b border-[#00ff87]/20 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1
              className="text-2xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00d4ff] bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate('/chronos')}
            >
              TriNetra
            </h1>
            <span className="text-gray-400 hidden sm:block">|</span>
            <div className={`flex items-center gap-2 text-xl font-semibold hidden sm:block ${pageTitleColor}`}>
              {pageIcon && <span>{pageIcon}</span>}
              <span>{pageTitle}</span>
            </div>
          </div>

          {/* Navigation links */}
          <div className="hidden md:flex items-center space-x-3">
            {NAV_ITEMS.map(({ path, label, icon, color }) => {
              const isActive = location.pathname === path
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`px-5 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 border-2 flex items-center gap-2.5 shadow-lg
                    ${isActive
                      ? `${color} bg-white/15 shadow-[0_0_20px_rgba(0,255,135,0.3)] scale-105`
                      : 'text-gray-400 border-gray-600/50 hover:text-white hover:bg-white/10 hover:border-white/30 hover:scale-105'
                    }`}
                >
                  <Icon name={icon} size={20} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center space-x-3">
            {user && (
              <span className="text-gray-300 text-sm hidden sm:block">Welcome, {user}</span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <Icon name="LogOut" size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
