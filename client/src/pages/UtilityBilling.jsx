import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { COST_CATEGORIES } from './Costs'

const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)

const DIST_KEY_LABELS = {
  sqm:     'Wohnfläche (m²)',
  units:   'Einheiten (gleiche Teile)',
  persons: 'Personenanzahl',
}

const EMPTY = {
  property_id: '',
  year: new Date().getFullYear() - 1,
  period_from: `${new Date().getFullYear() - 1}-01-01`,
  period_to:   `${new Date().getFullYear() - 1}-12-31`,
  status: 'draft',
  notes: '',
}

export default function UtilityBilling() {
  const [bills, setBills] = useState([])
  const [properties, setProperties] = useState([])
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => Promise.all([api.getUtilityBills(), api.getProperties()])
    .then(([b, p]) => { setBills(b); setProperties(p) })
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.createUtilityBill(form)
      else await api.updateUtilityBill(modal.data.id, form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Nebenkostenabrechnung löschen?')) return
    await api.deleteUtilityBill(id); load()
  }

  const openDetail = async (id) => {
    const bill = await api.getUtilityBill(id)
    setDetail(bill)
  }

  const statusBadge = (s) => {
    if (s === 'draft')     return <span className="badge-yellow">Entwurf</span>
    if (s === 'sent')      return <span className="badge-blue">Verschickt</span>
    if (s === 'finalized') return <span className="badge-green">Abgeschlossen</span>
    return <span className="badge-gray">{s}</span>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nebenkostenabrechnung</h1>
          <p className="text-gray-500 text-sm mt-1">Kosten werden automatisch aus dem Kosten-Modul importiert</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ mode: 'create', data: { ...EMPTY } })}>
          + Abrechnung anlegen
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Objekt</th>
              <th>Jahr</th>
              <th>Zeitraum</th>
              <th>Verteilerschlüssel</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Noch keine Abrechnungen</td></tr>
            ) : bills.map(b => (
              <tr key={b.id}>
                <td className="font-medium">{b.property_name}</td>
                <td>{b.year}</td>
                <td className="text-gray-600 text-sm">{b.period_from} – {b.period_to}</td>
                <td className="text-gray-600 text-sm">{DIST_KEY_LABELS[b.distribution_key] || 'Wohnfläche (m²)'}</td>
                <td>{statusBadge(b.status)}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="text-green-600 hover:underline text-xs" onClick={() => openDetail(b.id)}>Ansehen</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-blue-600 hover:underline text-xs" onClick={() => setModal({ mode: 'edit', data: { ...b } })}>Bearbeiten</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-red-500 hover:underline text-xs" onClick={() => del(b.id)}>Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <EditModal
          title={modal.mode === 'create' ? 'Abrechnung anlegen' : 'Abrechnung bearbeiten'}
          onClose={() => setModal(null)} onSave={save}
          initial={modal.data} properties={properties} saving={saving}
        />
      )}

      {detail && <DetailModal bill={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function EditModal({ title, onClose, onSave, initial, properties, saving }) {
  const [form, setForm] = useState(initial)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const loadPreview = async () => {
    if (!form.property_id || !form.period_from || !form.period_to) return
    setPreviewing(true)
    try {
      const data = await api.previewUtilityBill({
        property_id: form.property_id,
        period_from: form.period_from,
        period_to: form.period_to,
      })
      setPreview(data)
    } catch (e) {
      console.error(e)
    } finally { setPreviewing(false) }
  }

  useEffect(() => { loadPreview() }, [form.property_id, form.period_from, form.period_to])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl">
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
              <label className="form-label">Zeitraum von *</label>
              <input className="form-input" type="date" value={form.period_from} onChange={e => set('period_from', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Zeitraum bis *</label>
              <input className="form-input" type="date" value={form.period_to} onChange={e => set('period_to', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Abrechnungsjahr</label>
              <input className="form-input" type="number" value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">Entwurf</option>
                <option value="sent">Verschickt</option>
                <option value="finalized">Abgeschlossen</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Notizen</label>
              <textarea className="form-input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Vorschau */}
          {previewing && <p className="text-sm text-gray-400">Kosten werden geladen…</p>}
          {preview && !previewing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-800">
                  Automatisch importierte Kosten ({preview.costs.length} Positionen)
                </p>
                <span className="text-xs text-blue-600">
                  Schlüssel: {DIST_KEY_LABELS[preview.distribution_key] || '—'}
                </span>
              </div>
              {preview.costs.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Keine umlagefähigen Kosten für diesen Zeitraum gefunden. Bitte im Kosten-Modul erfassen.
                </p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {preview.costs.map(c => {
                    const cat = COST_CATEGORIES.find(x => x.value === c.category)
                    return (
                      <div key={c.id} className="flex justify-between text-xs text-blue-900">
                        <span>{c.date} · {cat?.label || c.category}</span>
                        <span className="font-medium">{fmt(c.amount)}</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between text-sm font-bold text-blue-900 border-t border-blue-200 pt-2 mt-1">
                    <span>Gesamt umlagefähig</span>
                    <span>{fmt(preview.totalCosts)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.property_id || !form.period_from || !form.period_to}
            onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ bill, onClose }) {
  const catLabel = (cat) => COST_CATEGORIES.find(x => x.value === cat)?.label || cat

  // Kosten nach Kategorie gruppieren
  const costsByCategory = {}
  ;(bill.costs || []).forEach(c => {
    if (!costsByCategory[c.category]) costsByCategory[c.category] = { label: catLabel(c.category), total: 0, items: [] }
    costsByCategory[c.category].total += c.amount
    costsByCategory[c.category].items.push(c)
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-3xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold">
              Nebenkostenabrechnung {bill.year} – {bill.property_name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Zeitraum: {bill.period_from} bis {bill.period_to} ·
              Schlüssel: {DIST_KEY_LABELS[bill.distribution_key] || 'Wohnfläche (m²)'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="modal-body space-y-5">

          {/* Gesamtkosten nach Kategorie */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Gesamtkosten (umlagefähig)</h3>
            {Object.keys(costsByCategory).length === 0 ? (
              <p className="text-sm text-gray-400">Keine Kosten für diesen Zeitraum erfasst.</p>
            ) : (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Kostenart</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Betrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(costsByCategory).map(([cat, { label, total }]) => (
                      <tr key={cat} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">{label}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td className="px-3 py-2 font-bold">Gesamt</td>
                      <td className="px-3 py-2 text-right font-bold">{fmt(bill.totalCosts)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Verteilung pro Einheit */}
          {bill.distribution?.length > 0 && bill.totalCosts > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                Verteilung auf Einheiten nach {DIST_KEY_LABELS[bill.distribution_key] || 'Wohnfläche'}
              </h3>
              <div className="space-y-3">
                {bill.distribution.map(u => (
                  <div key={u.unit_id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header der Einheit */}
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                      <div>
                        <p className="font-semibold text-sm">{u.unit_name}</p>
                        <p className="text-xs text-gray-500">
                          {u.tenant_name || 'Leerstand'}
                          {u.size_sqm ? ` · ${u.size_sqm} m²` : ''}
                          {bill.distribution_key === 'persons' ? ` · ${u.persons_count} Person(en)` : ''}
                          {` · Anteil: ${u.share.toFixed(1)} %`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{fmt(u.unit_costs)}</p>
                        <p className={`text-xs font-medium ${u.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {u.diff >= 0
                            ? `+ ${fmt(u.diff)} Guthaben`
                            : `${fmt(Math.abs(u.diff))} Nachzahlung`}
                        </p>
                      </div>
                    </div>

                    {/* Aufschlüsselung der Kostenarten */}
                    <div className="px-4 py-2 bg-white">
                      <p className="text-xs text-gray-500 mb-1">Aufschlüsselung:</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                        {u.breakdown.filter(b => b.total > 0).map(b => (
                          <div key={b.category} className="flex justify-between text-xs text-gray-600">
                            <span>{catLabel(b.category)}</span>
                            <span>{fmt(b.unitAmount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1 pt-1 border-t border-gray-100">
                        <span>Vorauszahlungen (NK × 12 Mte.)</span>
                        <span>{fmt(u.prepaid)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!bill.costs || bill.costs.length === 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              ⚠️ Für diesen Zeitraum wurden noch keine umlagefähigen Kosten im <strong>Kosten-Modul</strong> erfasst.
              Bitte dort zuerst die Betriebskosten eintragen.
            </div>
          )}
        </div>

        <div className="modal-footer sticky bottom-0 bg-white border-t">
          <button className="btn-secondary" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  )
}

// Hilfsfunktion für Kategorie-Label (auch im DetailModal nutzbar)
function catLabel(cat) {
  return COST_CATEGORIES.find(x => x.value === cat)?.label || cat
}
