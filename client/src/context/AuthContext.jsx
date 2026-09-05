import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Erlaubte Ziel-Prefixe für die Zahlungs-Weiterleitung (Open-Redirect-Schutz).
// Nur exakte, hartkodierte Stripe-HTTPS-Prefixe – kein dynamisches Ziel.
const ALLOWED_REDIRECT_PREFIXES = ['https://checkout.stripe.com/', 'https://billing.stripe.com/']

// Nur wohlgeformte JWTs (drei Base64url-Segmente) in den Browser-Speicher schreiben.
// Validierung vor dem Persistieren verhindert, dass manipulierte/ungültige Werte
// als Token gespeichert werden (Absicherung von Daten aus Antworten/URL).
function isValidJwt(t) {
  return typeof t === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)
}

function storeToken(t) {
  if (!isValidJwt(t)) return false
  localStorage.setItem('immo_token', t)
  return true
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => {
    // Token aus URL-Hash lesen (kommt von Landingpage nach Demo-Signup)
    const hash = window.location.hash
    const match = hash.match(/demo_token=([^&]+)/)
    if (match) {
      const t = decodeURIComponent(match[1])
      if (storeToken(t)) {
        window.history.replaceState(null, '', window.location.pathname)
        return t
      }
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
    storeToken(data.token)
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
    storeToken(data.token)
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
    storeToken(data.token)
    setToken(data.token)
    setUser(data.user)
    setLicenseExpired(false)
    return data
  }

  // Nach der Zahlung frisches Token mit verlängerter Lizenz holen (Webhook hat sie verlängert)
  const refreshLicense = async () => {
    const t = localStorage.getItem('immo_token')
    if (!t) return
    try {
      const res = await fetch('/api/billing/refresh', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
      if (!res.ok) return
      const data = await res.json()
      storeToken(data.token)
      setToken(data.token)
      setUser(data.user)
      setLicenseExpired(data.license_expired || false)
    } catch (e) { /* ignore */ }
  }

  // Kauf starten: Stripe-Checkout (Einmalkauf). Fallback auf Kontakt-Mail, wenn nicht konfiguriert.
  const buyLicense = async () => {
    const t = localStorage.getItem('immo_token')
    try {
      const cfg = await fetch('/api/billing/config').then(r => r.json()).catch(() => ({}))
      if (!cfg.enabled) {
        window.location.href = 'mailto:info@immo-app.de?subject=AllDesk%20Immo%20Lizenz%20kaufen'
        return
      }
      const res = await fetch('/api/billing/checkout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
      const data = await res.json()
      // Sicherheit (Open-Redirect-Schutz): nur weiterleiten, wenn das Ziel mit einem
      // fest erlaubten Stripe-Prefix beginnt. Prüfung direkt an der Weiterleitung.
      const target = typeof data.url === 'string' ? data.url : ''
      if (ALLOWED_REDIRECT_PREFIXES.some(prefix => target.startsWith(prefix))) {
        window.location.href = target
      } else {
        alert(data.error || 'Kauf konnte nicht gestartet werden.')
      }
    } catch (e) { alert('Server nicht erreichbar.') }
  }

  // Rücksprung von Stripe (?bezahlt=1) → Token auffrischen (mit kleinem Retry gegen Webhook-Race)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('bezahlt') === '1') {
      window.history.replaceState(null, '', window.location.pathname)
      refreshLicense()
      setTimeout(refreshLicense, 3000)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, licenseExpired, login, logout, activateLicense, startDemo, buyLicense, refreshLicense }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
