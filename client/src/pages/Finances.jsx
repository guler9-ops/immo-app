import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api'

const TYPES = [
  { value: 'rent', label: 'Miete' },
  { value: 'utilities', label: 'Nebenkosten' },
  { value: 'deposit', label: 'Kaution' },
  { value: 'other', label: 'Sonstiges' },
]

const EMPTY = { lease_id: '', amount: '', type: 'rent', date: new Date().toISOString().split('T')[0], description: '', status: 'received' }
const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function Finances() {
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState([])
  const [leases, setLeases] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('list') // list | chart

  const load = () => Promise.all([api.getPayments(), api.getPaymentSummary(), api.getLeases()])
    .then(([p, s, l]) => { setPayments(p); setSummary(s.slice(0, 12).reverse()); setLeases(l) })
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      await api.createPayment(form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Zahlung löschen?')) return
    await api.deletePayment(id); load()
  }

  const totalThisMonth = () => {
    const m = new Date().toISOString().slice(0, 7)
    const s = summary.find(s => s.month === m)
    return s?.total || 0
  }

  const totalAll = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finanzen & Mieteinnahmen</h1>
          <p className="text-gray-500 text-sm mt-1">{payments.length} Zahlungen erfasst</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ data: { ...EMPTY } })}>+ Zahlung erfassen</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{fmt(totalThisMonth())}</p>
          <p className="text-sm text-gray-500 mt-1">Einnahmen diesen Monat</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{fmt(totalAll)}</p>
          <p className="text-sm text-gray-500 mt-1">Gesamt erfasst</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-700">{payments.length}</p>
          <p className="text-sm text-gray-500 mt-1">Zahlungen gesamt</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`btn ${tab === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('list')}>Liste</button>
        <button className={`btn ${tab === 'chart' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('chart')}>Diagramm</button>
      </div>

      {tab === 'chart' && (
        <div className="card">
          <h2 className="font-semibold mb-4">Einnahmen letzte 12 Monate</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}€`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="rent_total" name="Miete" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="utilities_total" name="NK" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'list' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Mieter</th>
                <th>Einheit</th>
                <th>Typ</th>
                <th>Beschreibung</th>
                <th>Betrag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">Noch keine Zahlungen</td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td className="font-medium">{p.tenant_name}</td>
                  <td className="text-gray-600">{p.unit_name}</td>
                  <td>
                    <span className={`badge ${p.type === 'rent' ? 'badge-blue' : p.type === 'utilities' ? 'badge-green' : 'badge-gray'}`}>
                      {TYPES.find(t => t.value === p.type)?.label || p.type}
                    </span>
                  </td>
                  <td className="text-gray-600">{p.description || '–'}</td>
                  <td className="font-semibold text-green-600">{fmt(p.amount)}</td>
                  <td><button className="text-red-500 hover:underline text-xs" onClick={() => del(p.id)}>Löschen</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="Zahlung erfassen" onClose={() => setModal(null)} onSave={save}
          initial={modal.data} leases={leases} saving={saving} />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, leases, saving }) {
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
              <label className="form-label">Mietvertrag *</label>
              <select className="form-select" value={form.lease_id} onChange={e => set('lease_id', e.target.value)}>
                <option value="">Bitte wählen</option>
                {leases.filter(l => l.status === 'active').map(l => (
                  <option key={l.id} value={l.id}>{l.tenant_name} – {l.unit_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Datum *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Typ</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Betrag (€) *</label>
              <input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="received">Eingegangen</option>
                <option value="pending">Ausstehend</option>
                <option value="overdue">Überfällig</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Beschreibung</label>
              <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="z.B. Miete Juli 2026" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.lease_id || !form.amount || !form.date} onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
