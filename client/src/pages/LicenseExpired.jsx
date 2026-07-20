import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// ← Hier Ihre Kontakt-/Kaufseite eintragen
const BUY_URL = 'mailto:info@immo-app.de?subject=ImmoApp%20Lizenz%20kaufen'

export default function LicenseExpired() {
  const { user, activateLicense, logout } = useAuth()
  const isDemo = user?.plan === 'demo'

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await activateLicense(code)
      setSuccess(true)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">

        {isDemo ? (
          <>
            <div className="text-5xl mb-4">⏰</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ihre Demo-Zeit ist abgelaufen</h1>
            <p className="text-gray-500 text-sm mb-8">
              Wir hoffen, ImmoApp hat Ihnen gefallen! Sichern Sie sich jetzt Ihren Vollzugang.
            </p>

            {/* Feature-Übersicht */}
            <div className="bg-blue-50 rounded-xl p-5 mb-6 text-left">
              <p className="font-semibold text-blue-900 mb-3">ImmoApp Vollversion enthält:</p>
              <ul className="space-y-2 text-sm text-blue-800">
                {['Unbegrenzte Objekte & Einheiten', 'Mieter & Mietvertragsverwaltung', 'Automatische Nebenkostenabrechnung',
                  'Finanzen & Kreditverwaltung', 'Dokumentenverwaltung', 'Kreditvergleich mit allen deutschen Banken',
                  'Eigentümerverwaltung', 'Updates & Support inklusive'].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
                ))}
              </ul>
            </div>

            {success ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 font-semibold mb-4">
                ✅ Lizenz aktiviert! App wird neu geladen...
              </div>
            ) : (
              <>
                <a href={BUY_URL}
                  className="block w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-lg font-bold transition-colors mb-3">
                  🛒 Jetzt kaufen — Vollzugang sichern
                </a>

                {!showCode ? (
                  <button onClick={() => setShowCode(true)} className="text-sm text-blue-600 hover:underline mb-3 block w-full">
                    Ich habe bereits einen Lizenzcode →
                  </button>
                ) : (
                  <form onSubmit={submit} className="space-y-3 mb-3">
                    <input className="form-input font-mono text-center text-lg tracking-widest"
                      type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="IMMO-XXXX-XXXX-XXXX" required />
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
                    <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-semibold">
                      {loading ? 'Prüfen...' : '🔑 Code aktivieren'}
                    </button>
                  </form>
                )}

                <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600 underline block w-full">
                  Nein danke, App beenden
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {/* Bezahlte Lizenz abgelaufen */}
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Lizenz abgelaufen</h1>
            <p className="text-gray-500 text-sm mb-6">
              Hallo <strong>{user?.username}</strong>, Ihre Lizenz ist abgelaufen.<br />
              Bitte kontaktieren Sie ImmoApp um Ihre Lizenz zu verlängern.
            </p>

            {success ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 font-semibold">
                ✅ Lizenz erfolgreich aktiviert! App wird neu geladen...
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 text-left">
                <div>
                  <label className="form-label">Lizenzcode eingeben</label>
                  <input className="form-input font-mono text-center text-lg tracking-widest"
                    type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="IMMO-XXXX-XXXX-XXXX" required />
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
                <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-semibold">
                  {loading ? 'Prüfen...' : '🔑 Lizenz aktivieren'}
                </button>
              </form>
            )}

            <button onClick={logout} className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline">
              Abmelden
            </button>
          </>
        )}

        <p className="text-xs text-gray-300 mt-6">ImmoApp · info@immo-app.de</p>
      </div>
    </div>
  )
}
