import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => {
    // Token aus URL-Hash lesen (kommt von Landingpage nach Demo-Signup)
    const hash = window.location.hash
    const match = hash.match(/demo_token=([^&]+)/)
    if (match) {
      const t = decodeURIComponent(match[1])
      localStorage.setItem('immo_token', t)
      window.history.replaceState(null, '', window.location.pathname)
      return t
    }
    return localStorage.getItem('immo_token')
  })
  const [loading, setLoading] = useState(true)
  const [licenseExpired, setLicenseExpired] = useState(false)

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (r.status === 401) { logout(); return null }
          if (r.status === 403) { setLicenseExpired(true); return r.json() }
          return r.json()
        })
        .then(u => { if (u) setUser(u) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Fehler')
    localStorage.setItem('immo_token', data.token)
    setToken(data.token)
    setUser(data.user)
    setLicenseExpired(data.license_expired || false)
    return data
  }

  const logout = () => {
    localStorage.removeItem('immo_token')
    setToken(null)
    setUser(null)
    setLicenseExpired(false)
  }

  const startDemo = async (email) => {
    const res = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Fehler')
    localStorage.setItem('immo_token', data.token)
    setToken(data.token)
    setUser(data.user)
    setLicenseExpired(data.license_expired || false)
    return data
  }

  const activateLicense = async (code) => {
    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Ungültiger Code')
    localStorage.setItem('immo_token', data.token)
    setToken(data.token)
    setUser(data.user)
    setLicenseExpired(false)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, licenseExpired, login, logout, activateLicense, startDemo }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
