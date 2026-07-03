import React, { useEffect, useState } from 'react'
import { api } from '../api'

const EMPTY = { unit_id: '', tenant_id: '', start_date: '', end_date: '', rent_cold: '', rent_utilities: '', deposit: '', status: 'active', notes: '' }
const fmt = (n) => n != null ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n) : '–'

export default function Leases() {
  const [items, setItems] = useState([])
  const [units, setUnits] = useState([])
  const [tenants, setTenants] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => Promise.all([api.getLeases(), api.getUnits(), api.getTenants()])
    .then(([l, u, t]) => { setItems(l); setUnits(u); setTenants(t) })
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.createLease(form)
      else await api.updateLease(modal.data.id, form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Mietvertrag löschen?')) return
    await api.deleteLease(id); load()
  }

  const statusBadge = (s) => {
    if (s === 'active') return <span className="badge-green">Aktiv</span>
    if (s === 'ended') return <span className="badge-gray">Beendet</span>
    return <span className="badge-yellow">{s}</span>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mietverträge</h1>
          <p className="text-gray-500 text-sm mt-1">{items.filter(i => i.status === 'active').length} aktive Verträge</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ mode: 'create', data: { ...EMPTY } })}>+ Vertrag anlegen</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Mieter</th>
              <th>Einheit / Objekt</th>
              <th>Beginn</th>
              <th>Ende</th>
              <th>Kaltmiete</th>
              <th>NK</th>
              <th>Kaution</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-400 py-8">Keine Mietverträge vorhanden</td></tr>
            ) : items.map(l => (
              <tr key={l.id}>
                <td className="font-medium">{l.tenant_name}</td>
                <td>
                  <span className="text-sm">{l.unit_name}</span>
                  <span className="text-xs text-gray-400 block">{l.property_name}</span>
                </td>
                <td>{l.start_date}</td>
                <td>{l.end_date || <span className="text-gray-400">Unbefristet</span>}</td>
                <td>{fmt(l.rent_cold)}</td>
                <td>{fmt(l.rent_utilities)}</td>
                <td>{fmt(l.deposit)}</td>
                <td>{statusBadge(l.status)}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="text-blue-600 hover:underline text-xs" onClick={() => setModal({ mode: 'edit', data: { ...l } })}>Bearbeiten</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-red-500 hover:underline text-xs" onClick={() => del(l.id)}>Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Mietvertrag anlegen' : 'Mietvertrag bearbeiten'}
          onClose={() => setModal(null)} onSave={save} initial={modal.data}
          units={units} tenants={tenants} saving={saving} />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, units, tenants, saving }) {
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
              <label className="form-label">Einheit *</label>
              <select className="form-select" value={form.unit_id} onChange={e => set('unit_id', e.target.value)}>
                <option value="">Bitte wählen</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.property_name} – {u.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Mieter *</label>
              <select className="form-select" value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
                <option value="">Bitte wählen</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Beginn *</label>
              <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Ende (leer = unbefristet)</label>
              <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Kaltmiete (€) *</label>
              <input className="form-input" type="number" value={form.rent_cold} onChange={e => set('rent_cold', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Nebenkosten (€)</label>
              <input className="form-input" type="number" value={form.rent_utilities} onChange={e => set('rent_utilities', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Kaution (€)</label>
              <input className="form-input" type="number" value={form.deposit} onChange={e => set('deposit', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Aktiv</option>
                <option value="ended">Beendet</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Notizen</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.unit_id || !form.tenant_id || !form.start_date || !form.rent_cold} onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
