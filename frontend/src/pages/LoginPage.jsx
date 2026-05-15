import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }
    setError('')
    navigate('/mde/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-cyan-300/20 bg-slate-950/60 backdrop-blur-xl p-8"
      >
        <h1 className="text-2xl font-semibold text-white text-center">TriNetra Login</h1>
        <p className="text-slate-400 text-sm text-center mt-2">
          Sign in to open the Mule Detection Engine dashboard.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-rose-200 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full h-11 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-300/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full h-11 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-300/60"
          />
          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  )
}
