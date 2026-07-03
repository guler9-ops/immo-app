import React, { useEffect, useState } from 'react'
import { api } from '../api'

const MAX_OWNERS = 10
const LICENSE_PER_PROPERTY = 9.99

const ROLES = ['Eigentümer', 'Miteigentümer', 'Verwalter', 'Bevollmächtigter']
const SALUTATIONS = ['Herr', 'Frau', 'Divers', 'Firma']

const EMPTY = {
  salutation: 'Herr', first_name: '', last_name: '', email: '', phone: '',
  address: '', zip: '', city: '', iban: '', tax_number: '',
  ownership_share: 100, role: 'Eigentümer', notes: ''
}

const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function Owners() {
  const [data, setData] = useState({ owners: [], propertyCount: 0 })
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => api.getOwners().then(setData)
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.createOwner(form)
      else await api.updateOwner(modal.data.id, form)
      setModal(null); load()
    } catch (e) {
      alert(e.message)
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Eigentümer löschen?')) return
    await api.deleteOwner(id); load()
  }

  const { owners, propertyCount } = data
  const totalMonthly = propertyCount * LICENSE_PER_PROPERTY
  const totalYearly = totalMonthly * 12
  const totalShare = owners.reduce((s, o) => s + (o.ownership_share || 0), 0)
  const canAdd = owners.length < MAX_OWNERS

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eigentümer</h1>
          <p className="text-gray-500 text-sm mt-1">
            {owners.length} / {MAX_OWNERS} Eigentümer · Daten werden für Nebenkostenabrechnungen verwendet
          </p>
        </div>
        <button className="btn-primary" disabled={!canAdd}
          onClick={() => setModal({ mode: 'create', data: { ...EMPTY, ownership_share: owners.length === 0 ? 100 : '' } })}>
          + Eigentümer anlegen
        </button>
      </div>

      {/* Lizenz-Box */}
      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🔑</span>
              <h2 className="font-bold text-blue-900 text-base">Software-Lizenz</h2>
            </div>
            <p className="text-sm text-blue-700">
              <strong>9,99 € / Monat pro Objekt</strong> · unbegrenzte Einheiten pro Objekt
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Lizenz gilt pro Objekt, unabhängig von der Anzahl der Einheiten.
            </p>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="bg-white rounded-lg px-4 py-3 text-center border border-blue-200 shadow-sm">
              <p className="text-2xl font-bold text-blue-700">{propertyCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Objekte</p>
            </div>
            <div className="bg-white rounded-lg px-4 py-3 text-center border border-blue-200 shadow-sm">
              <p className="text-2xl font-bold text-blue-700">{fmt(totalMonthly)}</p>
              <p className="text-xs text-gray-500 mt-0.5">/ Monat</p>
            </div>
            <div className="bg-white rounded-lg px-4 py-3 text-center border border-indigo-200 shadow-sm">
              <p className="text-2xl font-bold text-indigo-700">{fmt(totalYearly)}</p>
              <p className="text-xs text-gray-500 mt-0.5">/ Jahr</p>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: propertyCount }).map((_, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                🏢 Objekt {i + 1} · 9,99 €/Monat <span className="badge-green ml-1">Aktiv</span>
              </span>
            ))}
            {propertyCount === 0 && <span className="text-xs text-blue-600">Noch keine Objekte angelegt.</span>}
          </div>
        </div>
      </div>

      {/* Eigentümer-Karten */}
      {owners.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-gray-500">Noch kein Eigentümer angelegt.</p>
          <p className="text-gray-400 text-sm mt-1">Eigentümerdaten werden auf Nebenkostenabrechnungen angezeigt.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {owners.map(o => (
            <div key={o.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {o.first_name[0]}{o.last_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {o.salutation} {o.first_name} {o.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{o.role}</p>
                  </div>
                </div>
                <span className="badge-blue text-xs">{o.ownership_share} %</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                {o.email    && <p className="text-gray-600 col-span-2">📧 {o.email}</p>}
                {o.phone    && <p className="text-gray-600">📞 {o.phone}</p>}
                {o.address  && <p className="text-gray-600 col-span-2">📍 {o.address}, {o.zip} {o.city}</p>}
                {o.iban     && <p className="text-gray-500 col-span-2 text-xs font-mono">IBAN: {o.iban}</p>}
                {o.tax_number && <p className="text-gray-500 col-span-2 text-xs">Steuernr.: {o.tax_number}</p>}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button className="btn-secondary text-xs" onClick={() => setModal({ mode: 'edit', data: { ...o } })}>Bearbeiten</button>
                <button className="text-red-500 hover:underline text-xs" onClick={() => del(o.id)}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Eigentumsanteile-Hinweis */}
      {owners.length > 1 && (
        <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${Math.abs(totalShare - 100) < 0.01 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          {Math.abs(totalShare - 100) < 0.01
            ? `✅ Eigentumsanteile vollständig: 100 %`
            : `⚠️ Eigentumsanteile ergeben ${totalShare.toFixed(1)} % (sollte 100 % sein)`}
        </div>
      )}

      {!canAdd && (
        <p className="text-sm text-gray-400 text-center">Maximale Anzahl von {MAX_OWNERS} Eigentümern erreicht.</p>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Eigentümer anlegen' : 'Eigentümer bearbeiten'}
          onClose={() => setModal(null)} onSave={save}
          initial={modal.data} saving={saving}
        />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Anrede + Rolle */}
            <div>
              <label className="form-label">Anrede</label>
              <select className="form-select" value={form.salutation || ''} onChange={e => set('salutation', e.target.value)}>
                {SALUTATIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Rolle</label>
              <select className="form-select" value={form.role || 'Eigentümer'} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="form-label">Vorname *</label>
              <input className="form-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Nachname *</label>
              <input className="form-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>

            {/* Kontakt */}
            <div>
              <label className="form-label">E-Mail</label>
              <input className="form-input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Telefon</label>
              <input className="form-input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </div>

            {/* Adresse */}
            <div className="col-span-2">
              <label className="form-label">Straße & Hausnummer</label>
              <input className="form-input" value={form.address || ''} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className="form-label">PLZ</label>
              <input className="form-input" value={form.zip || ''} maxLength={5} onChange={e => set('zip', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Stadt</label>
              <input className="form-input" value={form.city || ''} onChange={e => set('city', e.target.value)} />
            </div>

            {/* Finanzdaten */}
            <div className="col-span-2">
              <label className="form-label">IBAN</label>
              <input className="form-input font-mono" value={form.iban || ''} onChange={e => set('iban', e.target.value)} placeholder="DE..." />
            </div>
            <div>
              <label className="form-label">Steuernummer</label>
              <input className="form-input" value={form.tax_number || ''} onChange={e => set('tax_number', e.target.value)} placeholder="z.B. 123/456/78901" />
            </div>
            <div>
              <label className="form-label">Eigentumsanteil (%)</label>
              <input className="form-input" type="number" min="0" max="100" step="0.1"
                value={form.ownership_share ?? 100} onChange={e => set('ownership_share', e.target.value)} />
            </div>

            <div className="col-span-2">
              <label className="form-label">Notizen</label>
              <textarea className="form-input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary"
            disabled={saving || !form.first_name || !form.last_name}
            onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
