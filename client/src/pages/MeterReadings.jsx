import React, { useEffect, useState } from 'react'
import { api } from '../api'

const TYPES = [
  { value: 'strom', label: '⚡ Strom' },
  { value: 'gas', label: '🔥 Gas' },
  { value: 'wasser_kalt', label: '💧 Wasser kalt' },
  { value: 'wasser_warm', label: '♨️ Wasser warm' },
  { value: 'heizung', label: '🌡️ Heizung' },
  { value: 'sonstiges', label: '📊 Sonstiges' },
]

const EMPTY = { unit_id: '', type: 'strom', value: '', date: new Date().toISOString().split('T')[0], notes: '' }

export default function MeterReadings() {
  const [readings, setReadings] = useState([])
  const [units, setUnits] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterUnit, setFilterUnit] = useState('')

  const load = () => Promise.all([api.getMeterReadings(filterUnit || undefined), api.getUnits()])
    .then(([r, u]) => { setReadings(r); setUnits(u) })
  useEffect(() => { load() }, [filterUnit])

  const save = async (form) => {
    setSaving(true)
    try {
      await api.createMeterReading(form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Zählerstand löschen?')) return
    await api.deleteMeterReading(id); load()
  }

  const typeLabel = (v) => TYPES.find(t => t.value === v)?.label || v

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zählerstände</h1>
          <p className="text-gray-500 text-sm mt-1">Alle Zählerstände im Überblick</p>
        </div>
        <div className="flex gap-3">
          <select className="form-select w-48" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
            <option value="">Alle Einheiten</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.property_name} – {u.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModal({ data: { ...EMPTY } })}>+ Zählerstand erfassen</button>
        </div>
      </div>

      {/* Aktuelle Zählerstände */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {TYPES.map(t => {
          const latest = readings.filter(r => r.type === t.value)
          const byUnit = {}
          latest.forEach(r => { if (!byUnit[r.unit_id]) byUnit[r.unit_id] = r })
          const count = Object.keys(byUnit).length
          return (
            <div key={t.value} className="card text-center py-4">
              <p className="text-2xl mb-1">{t.label.split(' ')[0]}</p>
              <p className="font-semibold text-gray-800">{t.label.split(' ').slice(1).join(' ')}</p>
              <p className="text-gray-500 text-sm">{count} Einheit{count !== 1 ? 'en' : ''}</p>
            </div>
          )
        })}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Einheit</th>
              <th>Objekt</th>
              <th>Typ</th>
              <th>Zählerstand</th>
              <th>Notizen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {readings.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Keine Zählerstände vorhanden</td></tr>
            ) : readings.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td className="font-medium">{r.unit_name}</td>
                <td className="text-gray-600">{r.property_name}</td>
                <td>{typeLabel(r.type)}</td>
                <td className="font-mono font-semibold">{r.value.toLocaleString('de-DE')}</td>
                <td className="text-gray-500">{r.notes || '–'}</td>
                <td><button className="text-red-500 hover:underline text-xs" onClick={() => del(r.id)}>Löschen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Zählerstand erfassen" onClose={() => setModal(null)} onSave={save}
          initial={modal.data} units={units} saving={saving} />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, units, saving }) {
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
            <div>
              <label className="form-label">Zähler-Typ *</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Datum *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Zählerstand *</label>
              <input className="form-input" type="number" step="0.001" value={form.value}
                onChange={e => set('value', e.target.value)} placeholder="z.B. 12345.678" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notizen</label>
              <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.unit_id || !form.value} onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
