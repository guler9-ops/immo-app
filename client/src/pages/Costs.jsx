import React, { useEffect, useState } from 'react'
import { api } from '../api'

// Betriebskostenarten gem. § 2 BetrKV
// allocatable = umlagefähig auf Mieter
export const COST_CATEGORIES = [
  // Umlagefähig (§ 2 BetrKV)
  { value: 'grundsteuer',       label: 'Grundsteuer',                          allocatable: true },
  { value: 'wasser',            label: 'Wasserversorgung',                     allocatable: true },
  { value: 'abwasser',          label: 'Entwässerung / Abwasser',              allocatable: true },
  { value: 'heizung',           label: 'Heizung / Heizkosten',                 allocatable: true },
  { value: 'warmwasser',        label: 'Warmwasserversorgung',                 allocatable: true },
  { value: 'aufzug',            label: 'Aufzug',                               allocatable: true },
  { value: 'strassenreinigung', label: 'Straßenreinigung / Winterdienst',      allocatable: true },
  { value: 'muell',             label: 'Müllbeseitigung / Müllabfuhr',         allocatable: true },
  { value: 'gebauedereinigung', label: 'Gebäudereinigung / Ungezieferbekämpfung', allocatable: true },
  { value: 'gartenpflege',      label: 'Gartenpflege / Grünpflege',            allocatable: true },
  { value: 'allgemeinstrom',    label: 'Allgemeinstrom / Beleuchtung',         allocatable: true },
  { value: 'schornstein',       label: 'Schornsteinreinigung',                 allocatable: true },
  { value: 'versicherung',      label: 'Gebäude- & Haftpflichtversicherung',   allocatable: true },
  { value: 'hauswart',          label: 'Hauswart / Hausmeister',               allocatable: true },
  { value: 'antenne',           label: 'Kabelanschluss / Gemeinschaftsantenne',allocatable: true },
  { value: 'waescherei',        label: 'Wäschepflegeeinrichtungen',            allocatable: true },
  { value: 'sonstige_umlagefaehig', label: 'Sonstige Betriebskosten (umlagefähig)', allocatable: true },
  // Nicht umlagefähig
  { value: 'instandhaltung',    label: 'Instandhaltung / Reparaturen',         allocatable: false },
  { value: 'verwaltung',        label: 'Verwaltungskosten',                    allocatable: false },
  { value: 'finanzierung',      label: 'Finanzierungskosten / Zinsen',         allocatable: false },
  { value: 'sonstige',          label: 'Sonstige Kosten (nicht umlagefähig)',  allocatable: false },
]

const EMPTY = { date: new Date().toISOString().split('T')[0], amount: '', category: 'grundsteuer', description: '', property_id: '' }

const fmt = (n) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export default function Costs() {
  const [items, setItems] = useState([])
  const [properties, setProperties] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())

  const load = () => {
    const params = {}
    if (filterYear) params.year = filterYear
    Promise.all([api.getCosts(params), api.getProperties()])
      .then(([c, p]) => { setItems(c); setProperties(p) })
  }

  useEffect(() => { load() }, [filterYear])

  const save = async (form) => {
    setSaving(true)
    try {
      const cat = COST_CATEGORIES.find(c => c.value === form.category)
      const payload = { ...form, allocatable: cat?.allocatable ? 1 : 0 }
      if (modal.mode === 'create') await api.createCost(payload)
      else await api.updateCost(modal.data.id, payload)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Kosteneintrag löschen?')) return
    await api.deleteCost(id); load()
  }

  const totalAll = items.reduce((s, c) => s + c.amount, 0)
  const totalAllocatable = items.filter(c => c.allocatable).reduce((s, c) => s + c.amount, 0)
  const totalNot = items.filter(c => !c.allocatable).reduce((s, c) => s + c.amount, 0)

  const years = []
  for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y.toString())

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kosten</h1>
          <p className="text-gray-500 text-sm mt-1">Betriebskosten & Ausgaben verwalten</p>
        </div>
        <div className="flex gap-3">
          <select className="form-select w-32" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">Alle Jahre</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModal({ mode: 'create', data: { ...EMPTY } })}>+ Kosten erfassen</button>
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Gesamtkosten {filterYear || 'gesamt'}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalAll)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Umlagefähig auf Mieter</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{fmt(totalAllocatable)}</p>
          <p className="text-xs text-gray-400 mt-1">gem. § 2 BetrKV</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Nicht umlagefähig</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{fmt(totalNot)}</p>
          <p className="text-xs text-gray-400 mt-1">Eigentümer trägt selbst</p>
        </div>
      </div>

      {/* Tabelle */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Kostenart</th>
              <th>Beschreibung</th>
              <th>Objekt</th>
              <th>Umlagefähig</th>
              <th className="text-right">Betrag</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Keine Kosteneinträge vorhanden</td></tr>
            ) : items.map(c => {
              const cat = COST_CATEGORIES.find(x => x.value === c.category)
              return (
                <tr key={c.id}>
                  <td className="text-gray-600">{c.date}</td>
                  <td className="font-medium">{cat?.label || c.category}</td>
                  <td className="text-gray-600">{c.description || '–'}</td>
                  <td className="text-gray-600">{c.property_name || <span className="text-gray-400">–</span>}</td>
                  <td>
                    {c.allocatable
                      ? <span className="badge-green text-xs">Ja (§ 2 BetrKV)</span>
                      : <span className="badge-gray text-xs">Nein</span>}
                  </td>
                  <td className="text-right font-semibold">{fmt(c.amount)}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button className="text-blue-600 hover:underline text-xs" onClick={() => setModal({ mode: 'edit', data: { ...c } })}>Bearbeiten</button>
                      <span className="text-gray-300">|</span>
                      <button className="text-red-500 hover:underline text-xs" onClick={() => del(c.id)}>Löschen</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={5} className="px-4 py-3 text-gray-700">Gesamt</td>
                <td className="text-right px-4 py-3">{fmt(totalAll)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Kosten erfassen' : 'Kosten bearbeiten'}
          onClose={() => setModal(null)} onSave={save}
          initial={modal.data} properties={properties} saving={saving}
        />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, properties, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectedCat = COST_CATEGORIES.find(c => c.value === form.category)
  const umlagefaehig = COST_CATEGORIES.filter(c => c.allocatable)
  const nichtUmlagefaehig = COST_CATEGORIES.filter(c => !c.allocatable)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Datum *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Betrag (€) *</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.amount}
                onChange={e => set('amount', e.target.value)} placeholder="0,00" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Kostenart *</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                <optgroup label="✅ Umlagefähig auf Mieter (§ 2 BetrKV)">
                  {umlagefaehig.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </optgroup>
                <optgroup label="❌ Nicht umlagefähig (Eigentümer)">
                  {nichtUmlagefaehig.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </optgroup>
              </select>
              {selectedCat && (
                <p className="text-xs mt-1 font-medium" style={{ color: selectedCat.allocatable ? '#15803d' : '#ea580c' }}>
                  {selectedCat.allocatable
                    ? '✅ Diese Kosten können auf den Mieter umgelegt werden.'
                    : '❌ Diese Kosten trägt der Eigentümer selbst.'}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="form-label">Beschreibung / Notiz</label>
              <input className="form-input" value={form.description || ''} onChange={e => set('description', e.target.value)}
                placeholder="z.B. Rechnung Stadtwerke März 2026" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Objekt (optional)</label>
              <select className="form-select" value={form.property_id || ''} onChange={e => set('property_id', e.target.value)}>
                <option value="">Kein Objekt / Allgemein</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.date || !form.amount || !form.category}
            onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
