import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => localStorage.getItem('trinetra_user') || null)

  const isAuthenticated = localStorage.getItem('trinetra_authenticated') === 'true' && !!user

  const login = useCallback((username) => {
    localStorage.setItem('trinetra_authenticated', 'true')
    localStorage.setItem('trinetra_user', username)
    setUser(username)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('trinetra_authenticated')
    localStorage.removeItem('trinetra_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
