import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const fmt = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '–'

export default function Admin() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [codes, setCodes] = useState([])
  const [tab, setTab] = useState('users')
  const [modal, setModal] = useState(null)
  const [codeModal, setCodeModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newCode, setNewCode] = useState(null)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = () => {
    fetch('/api/admin/users', { headers }).then(r => r.json()).then(setUsers)
    fetch('/api/admin/license-codes', { headers }).then(r => r.json()).then(setCodes)
  }
  useEffect(() => { load() }, [])

  const createUser = async (form) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal(null); load()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const deleteUser = async (id) => {
    if (!confirm('Kunden wirklich löschen?')) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers })
    load()
  }

  const extendLicense = async (id, months) => {
    const user = users.find(u => u.id === id)
    const base = user.license_expires_at && new Date(user.license_expires_at) > new Date()
      ? new Date(user.license_expires_at) : new Date()
    base.setMonth(base.getMonth() + months)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ license_expires_at: base.toISOString().slice(0, 10) })
    })
    load()
  }

  const genCode = async (form) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/license-codes', { method: 'POST', headers, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewCode(data.code)
      setCodeModal(null); load()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const deleteCode = async (id) => {
    if (!confirm('Code löschen?')) return
    await fetch(`/api/admin/license-codes/${id}`, { method: 'DELETE', headers })
    load()
  }

  const isExpired = (d) => d && new Date(d) < new Date()
  const daysLeft = (d) => {
    if (!d) return null
    const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
    return diff
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚙️ Admin-Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Kunden und Lizenzen verwalten</p>
        </div>
        <div className="flex gap-2">
          {tab === 'users' && (
            <button className="btn-primary" onClick={() => setModal({ username: '', email: '', password: '', duration_months: 12 })}>
              + Kunde anlegen
            </button>
          )}
          {tab === 'codes' && (
            <button className="btn-primary" onClick={() => setCodeModal({ user_id: '', duration_months: 12 })}>
              + Code generieren
            </button>
          )}
        </div>
      </div>

      {/* Neuer Code Banner */}
      {newCode && (
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800 mb-1">✅ Neuer Lizenzcode generiert — jetzt kopieren!</p>
            <p className="font-mono text-2xl font-bold text-green-700 tracking-widest">{newCode}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(newCode); alert('Code kopiert!') }}>
              📋 Kopieren
            </button>
            <button className="btn-secondary" onClick={() => setNewCode(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('users')}>
          👥 Kunden ({users.filter(u => u.role !== 'admin').length})
        </button>
        <button className={`btn ${tab === 'codes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('codes')}>
          🔑 Lizenzcodes ({codes.length})
        </button>
      </div>

      {/* Kunden */}
      {tab === 'users' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Benutzername</th>
                <th>E-Mail</th>
                <th>Lizenz bis</th>
                <th>Status</th>
                <th>Angelegt am</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'admin').length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">Noch keine Kunden angelegt</td></tr>
              ) : users.filter(u => u.role !== 'admin').map(u => {
                const expired = isExpired(u.license_expires_at)
                const days = daysLeft(u.license_expires_at)
                return (
                  <tr key={u.id}>
                    <td className="font-medium">{u.username}</td>
                    <td className="text-gray-500">{u.email || '–'}</td>
                    <td>{fmt(u.license_expires_at)}</td>
                    <td>
                      {expired
                        ? <span className="badge badge-red">Abgelaufen</span>
                        : days <= 30
                          ? <span className="badge badge-yellow">Läuft ab ({days} Tage)</span>
                          : <span className="badge badge-green">Aktiv ({days} Tage)</span>
                      }
                    </td>
                    <td className="text-gray-500 text-sm">{fmt(u.created_at)}</td>
                    <td className="space-x-2 text-xs">
                      <button className="text-blue-500 hover:underline" onClick={() => extendLicense(u.id, 12)}>+12 Monate</button>
                      <button className="text-red-500 hover:underline" onClick={() => deleteUser(u.id)}>Löschen</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lizenzcodes */}
      {tab === 'codes' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Dauer</th>
                <th>Zugewiesen an</th>
                <th>Status</th>
                <th>Eingelöst am</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">Noch keine Codes generiert</td></tr>
              ) : codes.map(c => (
                <tr key={c.id}>
                  <td className="font-mono font-bold text-blue-700">{c.code}</td>
                  <td>{c.duration_months} Monate</td>
                  <td className="text-gray-500">{c.username || '–'}</td>
                  <td>
                    {c.used
                      ? <span className="badge badge-gray">Eingelöst</span>
                      : <span className="badge badge-green">Verfügbar</span>
                    }
                  </td>
                  <td className="text-gray-500 text-sm">{c.used_at ? fmt(c.used_at) : '–'}</td>
                  <td>
                    {!c.used && (
                      <button className="text-red-500 hover:underline text-xs" onClick={() => deleteCode(c.id)}>Löschen</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kunden anlegen Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Neuen Kunden anlegen</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="form-label">Benutzername *</label>
                <input className="form-input" value={modal.username} onChange={e => setModal(m => ({ ...m, username: e.target.value }))} placeholder="z.B. mustermann" />
              </div>
              <div>
                <label className="form-label">E-Mail</label>
                <input className="form-input" type="email" value={modal.email} onChange={e => setModal(m => ({ ...m, email: e.target.value }))} placeholder="kunde@email.de" />
              </div>
              <div>
                <label className="form-label">Passwort *</label>
                <input className="form-input" type="password" value={modal.password} onChange={e => setModal(m => ({ ...m, password: e.target.value }))} placeholder="Sicheres Passwort" />
              </div>
              <div>
                <label className="form-label">Lizenzdauer</label>
                <select className="form-select" value={modal.duration_months} onChange={e => setModal(m => ({ ...m, duration_months: +e.target.value }))}>
                  <option value={1}>1 Monat (Test)</option>
                  <option value={3}>3 Monate</option>
                  <option value={6}>6 Monate</option>
                  <option value={12}>12 Monate</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn-primary" disabled={saving || !modal.username || !modal.password} onClick={() => createUser(modal)}>
                {saving ? 'Speichern...' : 'Kunde anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code generieren Modal */}
      {codeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCodeModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Lizenzcode generieren</h2>
              <button onClick={() => setCodeModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="form-label">Kunde (optional)</label>
                <select className="form-select" value={codeModal.user_id} onChange={e => setCodeModal(m => ({ ...m, user_id: e.target.value }))}>
                  <option value="">– Allgemeiner Code –</option>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Verlängerungsdauer</label>
                <select className="form-select" value={codeModal.duration_months} onChange={e => setCodeModal(m => ({ ...m, duration_months: +e.target.value }))}>
                  <option value={1}>1 Monat</option>
                  <option value={3}>3 Monate</option>
                  <option value={6}>6 Monate</option>
                  <option value={12}>12 Monate</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCodeModal(null)}>Abbrechen</button>
              <button className="btn-primary" disabled={saving} onClick={() => genCode(codeModal)}>
                {saving ? 'Generiere...' : '🔑 Code generieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
