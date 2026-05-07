import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      login(username)
      navigate('/chronos')
    }, 1000)
  }

  return (
    <div className="min-h-screen flex text-white overflow-x-hidden">
      {/* Left – Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-16 relative z-10">
        <div className="text-center mb-12">
          <div className="text-6xl font-extrabold bg-gradient-to-r from-[#00ff87] to-[#00d4ff] bg-clip-text text-transparent mb-4">
            TriNetra
          </div>
          <div className="text-gray-300 text-xl font-light opacity-80">Making the invisible visible</div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-12 w-full max-w-md shadow-2xl"
        >
          <h2 className="text-white text-3xl font-semibold text-center mb-8">Secure Access</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="username" className="block text-gray-300 text-sm font-medium mb-3">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-4 bg-black/30 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00ff87] focus:ring-2 focus:ring-[#00ff87]/20 transition-all"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="mb-8">
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-3">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-black/30 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00ff87] focus:ring-2 focus:ring-[#00ff87]/20 transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 bg-gradient-to-r from-[#00ff87] to-[#00d4ff] text-[#0a0a0f] text-lg font-semibold rounded-xl hover:shadow-lg hover:shadow-[#00ff87]/25 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Accessing System...' : 'Access TriNetra System'}
          </button>

          <div className="mt-6 text-center text-sm text-gray-400">
            Demo credentials: any username and password
          </div>
        </form>
      </div>

      {/* Right – Feature Showcase */}
      <div className="flex-1 bg-gradient-to-br from-[#00ff87]/10 to-[#00d4ff]/10 flex flex-col justify-center items-center px-8 lg:px-16 relative overflow-hidden">
        <div className="absolute top-16 left-16 w-72 h-72 bg-gradient-to-br from-[#00ff87]/20 to-[#00d4ff]/20 rounded-full animate-[float_6s_ease-in-out_infinite]" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-[#00d4ff]/20 to-[#00ff87]/20 rounded-full animate-[float_6s_ease-in-out_infinite_2s]" />

        <div className="text-center relative z-10 max-w-2xl">
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            Advanced Financial Crime Detection
          </h1>
          <p className="text-xl lg:text-2xl text-gray-300 mb-12 opacity-90 leading-relaxed">
            Harness the power of AI to detect and prevent financial crimes with unprecedented accuracy
          </p>

          <div className="grid gap-8 max-w-xl mx-auto">
            {[
              {
                icon: '🕐',
                title: 'CHRONOS Timeline',
                desc: 'Visualize transaction patterns across time with advanced temporal analysis and real-time monitoring',
                border: 'hover:border-[#00ff87]/30',
              },
              {
                icon: '🐍',
                title: 'HYDRA AI Red-Team',
                desc: 'AI-powered adversarial testing to strengthen detection algorithms against sophisticated attacks',
                border: 'hover:border-red-400/30',
              },
              {
                icon: '📋',
                title: 'Auto-SAR Generator',
                desc: 'Automated Suspicious Activity Report generation with ML-powered risk assessment and compliance',
                border: 'hover:border-orange-400/30',
              },
            ].map(({ icon, title, desc, border }) => (
              <div
                key={title}
                className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 text-left transition-all duration-300 hover:bg-white/8 hover:-translate-y-2 ${border}`}
              >
                <div className="text-4xl mb-4">{icon}</div>
                <div className="text-white text-xl font-semibold mb-3">{title}</div>
                <div className="text-gray-300 opacity-80 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
