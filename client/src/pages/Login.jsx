import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, startDemo } = useAuth()
  const [mode, setMode] = useState('login') // login | demo
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submitLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitDemo = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await startDemo(email)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">ImmoApp</h1>
          <p className="text-gray-500 text-sm mt-1">Professionelle Immobilienverwaltung</p>
        </div>

        {/* Tab-Auswahl */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Anmelden
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'demo' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setMode('demo'); setError('') }}
          >
            🎯 7 Tage kostenlos testen
          </button>
        </div>

        {/* Login */}
        {mode === 'login' && (
          <form onSubmit={submitLogin} className="space-y-4">
            <div>
              <label className="form-label">Benutzername</label>
              <input className="form-input" type="text" value={username}
                onChange={e => setUsername(e.target.value)} placeholder="Ihr Benutzername" autoFocus required />
            </div>
            <div>
              <label className="form-label">Passwort</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base font-semibold">
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Noch kein Konto?{' '}
              <button type="button" className="text-blue-600 hover:underline" onClick={() => setMode('demo')}>
                Jetzt kostenlos testen →
              </button>
            </p>
          </form>
        )}

        {/* Demo */}
        {mode === 'demo' && (
          <form onSubmit={submitDemo} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">✅ 7 Tage vollständiger Zugang</p>
              <p>Alle Funktionen ohne Einschränkungen. Keine Kreditkarte erforderlich.</p>
            </div>
            <div>
              <label className="form-label">Ihre E-Mail-Adresse</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="name@beispiel.de" autoFocus required />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-base font-semibold transition-colors">
              {loading ? 'Wird gestartet...' : '🚀 Demo starten'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Bereits registriert?{' '}
              <button type="button" className="text-blue-600 hover:underline" onClick={() => setMode('login')}>
                Anmelden →
              </button>
            </p>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">© ImmoApp · Lizenzierte Software</p>
      </div>
    </div>
  )
}
