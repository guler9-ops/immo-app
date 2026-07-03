import React, { useEffect, useState } from 'react'
import { api } from '../api'

const TYPES = ['Wohnung', 'Gewerberaum', 'Stellplatz', 'Garage', 'Lager', 'Sonstiges']
const EMPTY = { property_id: '', name: '', type: 'Wohnung', floor: '', size_sqm: '', rooms: '', rent_cold: '', rent_utilities: '', notes: '' }

export default function Units() {
  const [units, setUnits] = useState([])
  const [properties, setProperties] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const load = () => Promise.all([api.getUnits(), api.getProperties()]).then(([u, p]) => { setUnits(u); setProperties(p) })
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.createUnit(form)
      else await api.updateUnit(modal.data.id, form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Einheit löschen?')) return
    await api.deleteUnit(id); load()
  }

  const fmt = (n) => n ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n) : '–'

  const filtered = filter ? units.filter(u => u.property_id === Number(filter)) : units

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einheiten</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} Einheit{filtered.length !== 1 ? 'en' : ''}</p>
        </div>
        <div className="flex gap-3">
          <select className="form-select w-48" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Alle Objekte</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModal({ mode: 'create', data: { ...EMPTY } })}>+ Einheit anlegen</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Einheit</th>
              <th>Objekt</th>
              <th>Typ</th>
              <th>Größe</th>
              <th>Mieter</th>
              <th>Kaltmiete</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">Keine Einheiten vorhanden</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td className="text-gray-600">{u.property_name}</td>
                <td>{u.type}</td>
                <td>{u.size_sqm ? `${u.size_sqm} m²` : '–'}</td>
                <td>{u.tenant_name || <span className="text-gray-400">Leer</span>}</td>
                <td>{fmt(u.rent_cold)}</td>
                <td>
                  {u.tenant_name
                    ? <span className="badge-green">Vermietet</span>
                    : <span className="badge-yellow">Leer</span>}
                </td>
                <td>
                  <div className="flex gap-1">
                    <button className="text-blue-600 hover:underline text-xs" onClick={() => setModal({ mode: 'edit', data: { ...u } })}>Bearbeiten</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-red-500 hover:underline text-xs" onClick={() => del(u.id)}>Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Einheit anlegen' : 'Einheit bearbeiten'}
          onClose={() => setModal(null)} onSave={save} initial={modal.data}
          properties={properties} saving={saving} />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, properties, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Objekt *</label>
              <select className="form-select" value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                <option value="">Bitte wählen</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Bezeichnung *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Wohnung 1. OG links" />
            </div>
            <div>
              <label className="form-label">Typ</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Etage</label>
              <input className="form-input" type="number" value={form.floor} onChange={e => set('floor', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Größe (m²)</label>
              <input className="form-input" type="number" step="0.1" value={form.size_sqm} onChange={e => set('size_sqm', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Zimmer</label>
              <input className="form-input" type="number" step="0.5" value={form.rooms} onChange={e => set('rooms', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Kaltmiete (€)</label>
              <input className="form-input" type="number" value={form.rent_cold} onChange={e => set('rent_cold', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Nebenkosten (€)</label>
              <input className="form-input" type="number" value={form.rent_utilities} onChange={e => set('rent_utilities', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notizen</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.property_id || !form.name} onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
