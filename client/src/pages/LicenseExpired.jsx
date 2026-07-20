import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LicenseExpired() {
  const { user, activateLicense, logout } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await activateLicense(code)
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lizenz abgelaufen</h1>
        <p className="text-gray-500 text-sm mb-1">
          Hallo <strong>{user?.username}</strong>, Ihre Lizenz ist abgelaufen.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Bitte kontaktieren Sie ImmoApp um Ihre Lizenz zu verlängern und geben Sie den erhaltenen Code ein.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 font-semibold">
            ✅ Lizenz erfolgreich aktiviert! App wird neu geladen...
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-left">
            <div>
              <label className="form-label">Lizenzcode</label>
              <input
                className="form-input font-mono text-center text-lg tracking-widest"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="IMMO-XXXX-XXXX-XXXX"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-semibold">
              {loading ? 'Prüfen...' : '🔑 Lizenz aktivieren'}
            </button>
          </form>
        )}

        <button onClick={logout} className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline">
          Abmelden
        </button>

        <p className="text-xs text-gray-300 mt-4">
          Kontakt: info@immo-app.de
        </p>
      </div>
    </div>
  )
}
