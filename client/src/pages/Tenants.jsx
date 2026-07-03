import React, { useEffect, useState } from 'react'
import { api } from '../api'

const EMPTY = { first_name: '', last_name: '', email: '', phone: '', birth_date: '', address: '', iban: '', rent_cold: '', rent_utilities: '', notes: '' }

export default function Tenants() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => api.getTenants().then(setItems)
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.createTenant(form)
      else await api.updateTenant(modal.data.id, form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Mieter löschen?')) return
    await api.deleteTenant(id); load()
  }

  const filtered = items.filter(t =>
    !search || `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mieter</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} Mieter gesamt</p>
        </div>
        <div className="flex gap-3">
          <input className="form-input w-48" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={() => setModal({ mode: 'create', data: { ...EMPTY } })}>+ Mieter anlegen</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Telefon</th>
              <th>Kaltmiete</th>
              <th>Nebenkosten</th>
              <th>Einheiten</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">Keine Mieter vorhanden</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id}>
                <td className="font-medium">{t.first_name} {t.last_name}</td>
                <td className="text-gray-600">{t.email || '–'}</td>
                <td className="text-gray-600">{t.phone || '–'}</td>
                <td className="text-gray-700">{t.rent_cold ? `${Number(t.rent_cold).toLocaleString('de-DE', {minimumFractionDigits:2})} €` : <span className="text-gray-400">–</span>}</td>
                <td className="text-gray-700">{t.rent_utilities ? `${Number(t.rent_utilities).toLocaleString('de-DE', {minimumFractionDigits:2})} €` : <span className="text-gray-400">–</span>}</td>
                <td>{t.units || <span className="text-gray-400">–</span>}</td>
                <td>
                  {t.active_leases > 0
                    ? <span className="badge-green">Aktiv</span>
                    : <span className="badge-gray">Inaktiv</span>}
                </td>
                <td>
                  <div className="flex gap-1">
                    <button className="text-blue-600 hover:underline text-xs" onClick={() => setModal({ mode: 'edit', data: { ...t } })}>Bearbeiten</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-red-500 hover:underline text-xs" onClick={() => del(t.id)}>Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Mieter anlegen' : 'Mieter bearbeiten'}
          onClose={() => setModal(null)} onSave={save} initial={modal.data} saving={saving} />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, saving }) {
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
            <div>
              <label className="form-label">Vorname *</label>
              <input className="form-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Nachname *</label>
              <input className="form-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">E-Mail</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Telefon</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Geburtsdatum</label>
              <input className="form-input" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">IBAN</label>
              <input className="form-input" value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="DE..." />
            </div>
            <div>
              <label className="form-label">Kaltmiete (€)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.rent_cold} onChange={e => set('rent_cold', e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="form-label">Nebenkosten (€)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.rent_utilities} onChange={e => set('rent_utilities', e.target.value)} placeholder="0,00" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Adresse</label>
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notizen</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.first_name || !form.last_name} onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
