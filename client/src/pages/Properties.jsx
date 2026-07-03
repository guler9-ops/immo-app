import React, { useEffect, useState } from 'react'
import { api } from '../api'

const TYPES = ['Mehrfamilienhaus', 'Einfamilienhaus', 'Wohnanlage', 'Eigentumswohnung', 'Gewerbe', 'Gemischt', 'Sonstiges']

const DIST_KEYS = [
  { value: 'sqm',     label: 'Wohnfläche (m²)',          hint: 'Standard gem. § 556a BGB – anteilig nach Quadratmetern' },
  { value: 'units',   label: 'Einheiten (gleiche Teile)', hint: 'Jede Wohneinheit zahlt denselben Anteil' },
  { value: 'persons', label: 'Personenanzahl',            hint: 'Anteilig nach Anzahl der Bewohner je Einheit' },
]

const EMPTY = {
  name: '', address: '', city: '', zip: '', type: 'Mehrfamilienhaus',
  purchase_price: '', purchase_date: '', transfer_date: '', payment_date: '',
  land_share: '', building_share: '', total_sqm: '', mea: '',
  distribution_key: 'sqm', notes: ''
}

const fmt = (n) => n ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n) : null
const fmtN = (n) => n ? new Intl.NumberFormat('de-DE').format(n) : null

export default function Properties() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = () => api.getProperties().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.createProperty(form)
      else await api.updateProperty(modal.data.id, form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Objekt wirklich löschen? Alle Einheiten werden mitgelöscht.')) return
    await api.deleteProperty(id); load()
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Objekte</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} Objekt{items.length !== 1 ? 'e' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ mode: 'create', data: { ...EMPTY } })}>
          + Objekt anlegen
        </button>
      </div>

      {loading ? <p className="text-gray-400">Lädt...</p> : (
        items.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-gray-500">Noch keine Objekte. Lege dein erstes Objekt an!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(p => {
              const distKey = DIST_KEYS.find(d => d.value === (p.distribution_key || 'sqm'))
              return (
                <div key={p.id} className="card hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setDetail(p)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <p className="text-xs text-gray-500">{p.type}</p>
                    </div>
                    <span className="badge-blue">{p.unit_count} Einh.</span>
                  </div>
                  <p className="text-sm text-gray-600">{p.address}</p>
                  <p className="text-sm text-gray-600">{p.zip} {p.city}</p>

                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                    {p.purchase_price && <span>💰 {fmt(p.purchase_price)}</span>}
                    {p.total_sqm     && <span>📐 {fmtN(p.total_sqm)} m²</span>}
                    {p.purchase_date && <span>🛒 {p.purchase_date}</span>}
                    {p.mea           && <span>🏘 MEA {p.mea}</span>}
                  </div>

                  <p className="text-xs text-blue-600 mt-2">🔑 {distKey?.label}</p>

                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button className="btn-secondary text-xs" onClick={() => setModal({ mode: 'edit', data: { ...p } })}>Bearbeiten</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => del(p.id)}>Löschen</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Objekt anlegen' : 'Objekt bearbeiten'}
          onClose={() => setModal(null)} onSave={save}
          initial={modal.data} saving={saving}
        />
      )}

      {detail && <DetailModal prop={detail} onClose={() => setDetail(null)}
        onEdit={() => { setModal({ mode: 'edit', data: { ...detail } }); setDetail(null) }} />}
    </div>
  )
}

function DetailModal({ prop: p, onClose, onEdit }) {
  const distKey = DIST_KEYS.find(d => d.value === (p.distribution_key || 'sqm'))
  const landPct = p.purchase_price && p.land_share ? ((p.land_share / p.purchase_price) * 100).toFixed(1) : null
  const bldPct  = p.purchase_price && p.building_share ? ((p.building_share / p.purchase_price) * 100).toFixed(1) : null

  const row = (label, value) => value ? (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  ) : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-xl">
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="text-xs text-gray-500">{p.type} · {p.address}, {p.zip} {p.city}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-4">

          {/* Kaufdaten */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kaufdaten</h3>
            {row('Kaufpreis', fmt(p.purchase_price))}
            {row('Gekauft am', p.purchase_date)}
            {row('Eigentum überschrieben am', p.transfer_date)}
            {row('Bezahlt am', p.payment_date)}
          </div>

          {/* Wertaufteilung */}
          {(p.land_share || p.building_share) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Wertaufteilung</h3>
              {row('Grundstücksanteil', p.land_share ? `${fmt(p.land_share)}${landPct ? ` (${landPct} %)` : ''}` : null)}
              {row('Gebäudeanteil',     p.building_share ? `${fmt(p.building_share)}${bldPct ? ` (${bldPct} %)` : ''}` : null)}
              {(p.land_share && p.building_share) && (
                <div className="mt-2 h-3 rounded-full overflow-hidden bg-gray-100 flex">
                  <div className="bg-amber-400" style={{ width: `${landPct}%` }} title={`Grundstück ${landPct}%`} />
                  <div className="bg-blue-400" style={{ width: `${bldPct}%` }} title={`Gebäude ${bldPct}%`} />
                </div>
              )}
              {(p.land_share && p.building_share) && (
                <div className="flex gap-4 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Grundstück {landPct} %</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Gebäude {bldPct} %</span>
                </div>
              )}
            </div>
          )}

          {/* Fläche & MEA */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fläche & Eigentumsanteile</h3>
            {row('Gesamtfläche', p.total_sqm ? `${fmtN(p.total_sqm)} m²` : null)}
            {row('Miteigentumsanteil (MEA)', p.mea)}
          </div>

          {/* Nebenkosten */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nebenkostenverteilung</h3>
            {row('Verteilerschlüssel', distKey?.label)}
          </div>

          {p.notes && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{p.notes}</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Schließen</button>
          <button className="btn-primary" onClick={onEdit}>Bearbeiten</button>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const totalCheck = (parseFloat(form.land_share) || 0) + (parseFloat(form.building_share) || 0)
  const priceMismatch = form.purchase_price && totalCheck > 0 &&
    Math.abs(totalCheck - parseFloat(form.purchase_price)) > 1

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-5">

          {/* Stammdaten */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stammdaten</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Bezeichnung *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Musterstraße 10" />
              </div>
              <div className="col-span-2">
                <label className="form-label">Straße & Hausnummer *</label>
                <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <label className="form-label">PLZ *</label>
                <input className="form-input" value={form.zip} onChange={e => set('zip', e.target.value)} maxLength={5} />
              </div>
              <div>
                <label className="form-label">Stadt *</label>
                <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Typ</label>
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Gesamtfläche (m²)</label>
                <input className="form-input" type="number" step="0.01" value={form.total_sqm} onChange={e => set('total_sqm', e.target.value)} placeholder="z.B. 350" />
              </div>
              <div className="col-span-2">
                <label className="form-label">Miteigentumsanteil (MEA)</label>
                <input className="form-input" value={form.mea || ''} onChange={e => set('mea', e.target.value)} placeholder="z.B. 150/1000 oder 15,00 %" />
              </div>
            </div>
          </div>

          {/* Kaufdaten */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Kaufdaten</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Kaufpreis (€)</label>
                <input className="form-input" type="number" step="0.01" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="form-label">Gekauft am</label>
                <input className="form-input" type="date" value={form.purchase_date || ''} onChange={e => set('purchase_date', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Eigentum überschrieben am</label>
                <input className="form-input" type="date" value={form.transfer_date || ''} onChange={e => set('transfer_date', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Bezahlt am</label>
                <input className="form-input" type="date" value={form.payment_date || ''} onChange={e => set('payment_date', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Wertaufteilung */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Wertaufteilung</p>
            <p className="text-xs text-gray-400 mb-3">Relevant für Steuer (AfA-Berechnung) — Grundstück nicht abschreibbar</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Grundstücksanteil (€)</label>
                <input className="form-input" type="number" step="0.01" value={form.land_share || ''} onChange={e => set('land_share', e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="form-label">Gebäudeanteil (€)</label>
                <input className="form-input" type="number" step="0.01" value={form.building_share || ''} onChange={e => set('building_share', e.target.value)} placeholder="0,00" />
              </div>
              {priceMismatch && (
                <div className="col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ Grundstücks- + Gebäudeanteil ({new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalCheck)}) weichen vom Kaufpreis ab.
                </div>
              )}
            </div>
          </div>

          {/* Nebenkostenverteilung */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nebenkostenverteilung</p>
            <div>
              <label className="form-label">Verteilerschlüssel</label>
              <select className="form-select" value={form.distribution_key || 'sqm'} onChange={e => set('distribution_key', e.target.value)}>
                {DIST_KEYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {DIST_KEYS.find(d => d.value === (form.distribution_key || 'sqm'))?.hint}
              </p>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <label className="form-label">Notizen</label>
            <textarea className="form-input" rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>

        </div>
        <div className="modal-footer sticky bottom-0 bg-white border-t">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.name || !form.address || !form.city || !form.zip}
            onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
