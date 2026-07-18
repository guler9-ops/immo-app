import React, { useEffect, useState } from 'react'
import { api } from '../api'

const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)
const fmtP = (n) => (n || 0).toFixed(2).replace('.', ',') + ' %'

const EMPTY = {
  bank: '', objekt: '', zweck: 'Immobilienfinanzierung',
  kreditsumme: '', restschuld: '', tilgung: 2.0, zinsen: '',
  rate: '', startdatum: new Date().toISOString().slice(0, 10),
  laufzeit: 20, status: 'aktiv', notizen: ''
}

const ALL_BANKS = [
  // ── Großbanken ──
  { name: 'Deutsche Bank', ico: '🏦', base: 3.65, typ: 'Großbank', note: 'Ab 150.000 € Volumen' },
  { name: 'Commerzbank', ico: '🏦', base: 3.75, typ: 'Großbank', note: 'Flexible Tilgung möglich' },
  { name: 'HypoVereinsbank (UniCredit)', ico: '🏦', base: 3.70, typ: 'Großbank', note: 'Gut für Kapitalanleger' },
  { name: 'DZ Bank / VR-Banken', ico: '🏦', base: 3.60, typ: 'Genossenschaftsbank', note: 'Genossenschaftlich' },
  { name: 'Postbank', ico: '🏦', base: 3.80, typ: 'Großbank', note: 'Online-Antrag möglich' },
  // ── Sparkassen ──
  { name: 'Sparkasse (regional)', ico: '🔴', base: 3.55, typ: 'Sparkasse', note: 'Regionaler Bezug erforderlich' },
  { name: 'Helaba', ico: '🔴', base: 3.60, typ: 'Landesbank', note: 'Gewerbliche Finanzierung' },
  { name: 'LBBW', ico: '🔴', base: 3.58, typ: 'Landesbank', note: 'Baden-Württemberg' },
  { name: 'Bayern LB', ico: '🔴', base: 3.62, typ: 'Landesbank', note: 'Bayern' },
  { name: 'Nord/LB', ico: '🔴', base: 3.70, typ: 'Landesbank', note: 'Nord-Deutschland' },
  // ── Direktbanken / Online ──
  { name: 'ING Deutschland', ico: '🟠', base: 3.45, typ: 'Direktbank', note: 'Günstig, rein digital' },
  { name: 'DKB (Deutsche Kreditbank)', ico: '🟠', base: 3.40, typ: 'Direktbank', note: 'Sehr kompetitiv' },
  { name: 'Interhyp / ING-Diba Plattform', ico: '🟠', base: 3.35, typ: 'Vermittler', note: 'Vergleichsplattform' },
  { name: 'Dr. Klein', ico: '🟠', base: 3.38, typ: 'Vermittler', note: 'Berater-Netzwerk' },
  { name: 'Baufi24', ico: '🟠', base: 3.42, typ: 'Vermittler', note: 'Online-Vermittler' },
  { name: 'Check24 Baufinanzierung', ico: '🟠', base: 3.36, typ: 'Vermittler', note: 'Vergleichsportal' },
  // ── Versicherungen / Bausparkassen ──
  { name: 'Allianz Lebensversicherung', ico: '🛡️', base: 3.90, typ: 'Versicherung', note: 'Kombination mit LV möglich' },
  { name: 'Debeka Bauspar', ico: '🏠', base: 3.20, typ: 'Bausparkasse', note: 'Günstig nach Zuteilung' },
  { name: 'Wüstenrot', ico: '🏠', base: 3.25, typ: 'Bausparkasse', note: 'Kombilösung Bauspar+Kredit' },
  { name: 'Schwäbisch Hall (HUK)', ico: '🏠', base: 3.18, typ: 'Bausparkasse', note: 'Marktführer Bauspar' },
  { name: 'LBS (Landesbausparkassen)', ico: '🏠', base: 3.22, typ: 'Bausparkasse', note: 'Regional, sicher' },
  { name: 'BHW Bausparkasse', ico: '🏠', base: 3.30, typ: 'Bausparkasse', note: 'Postbank-Gruppe' },
  // ── Spezialbanken ──
  { name: 'Deutsche Hypo', ico: '🏛️', base: 3.55, typ: 'Hypothekenbank', note: 'Gewerbliche Immobilien' },
  { name: 'Münchener Hypothekenbank', ico: '🏛️', base: 3.50, typ: 'Hypothekenbank', note: 'Pfandbriefbank' },
  { name: 'Berlin Hyp', ico: '🏛️', base: 3.52, typ: 'Hypothekenbank', note: 'Immobilien-Spezialbank' },
  { name: 'Aareal Bank', ico: '🏛️', base: 3.65, typ: 'Hypothekenbank', note: 'Gewerbe-Fokus' },
  { name: 'pbb (Deutsche Pfandbriefbank)', ico: '🏛️', base: 3.60, typ: 'Hypothekenbank', note: 'Pfandbrief-Spezialist' },
  { name: 'DSL Bank', ico: '🟠', base: 3.42, typ: 'Direktbank', note: 'DZ Bank-Tochter' },
  { name: 'Hanseatic Bank', ico: '🏦', base: 3.85, typ: 'Konsumentenbank', note: 'Auch Immobilienkredite' },
  { name: 'TARGOBANK', ico: '🏦', base: 3.80, typ: 'Konsumentenbank', note: 'Crédit Mutuel-Gruppe' },
  { name: 'Santander Consumer Bank', ico: '🏦', base: 3.88, typ: 'Auslandsbank', note: 'Spanische Gruppe' },
  { name: 'BNP Paribas (inkl. Consors)', ico: '🏦', base: 3.72, typ: 'Auslandsbank', note: 'Französische Gruppe' },
  // ── KfW ──
  { name: 'KfW – Wohneigentum (124)', ico: '🌿', base: 3.15, typ: 'KfW', note: 'Selbstnutzer, max. 100.000 €' },
  { name: 'KfW – Energieeffizient Bauen (261)', ico: '🌿', base: 2.95, typ: 'KfW', note: 'QNG-Standard, max. 150.000 €' },
  { name: 'KfW – Klimafreundlich Neubau (300)', ico: '🌿', base: 2.85, typ: 'KfW', note: 'KN40-Standard, max. 100.000 €' },
  // ── Landesförderbanken ──
  { name: 'WIBank Hessen', ico: '🏛️', base: 2.90, typ: 'Förderbank', note: 'Hessen · Wohneigentum', maxF: 250000 },
  { name: 'NRW.BANK', ico: '🏛️', base: 2.75, typ: 'Förderbank', note: 'NRW · Eigentumsförderung', maxF: 200000 },
  { name: 'L-Bank Baden-Württemberg', ico: '🏛️', base: 2.80, typ: 'Förderbank', note: 'BW · Wohnraumförderung', maxF: 150000 },
  { name: 'LfA Bayern', ico: '🏛️', base: 2.70, typ: 'Förderbank', note: 'Bayern · BayernHeim', maxF: 300000 },
  { name: 'IBB Berlin', ico: '🏛️', base: 2.85, typ: 'Förderbank', note: 'Berlin · Wohnungsneubau', maxF: 100000 },
  { name: 'IFB Hamburg', ico: '🏛️', base: 2.80, typ: 'Förderbank', note: 'Hamburg · Eigentumsförderung', maxF: 100000 },
  { name: 'IB.SH Schleswig-Holstein', ico: '🏛️', base: 2.75, typ: 'Förderbank', note: 'SH · Darlehen bis 30 J.', maxF: 150000 },
  { name: 'BAB Bremen', ico: '🏛️', base: 2.85, typ: 'Förderbank', note: 'Bremen · Wohnraumförderung', maxF: 100000 },
  { name: 'NBank Niedersachsen', ico: '🏛️', base: 2.78, typ: 'Förderbank', note: 'Niedersachsen', maxF: 150000 },
  { name: 'ILB Brandenburg', ico: '🏛️', base: 2.82, typ: 'Förderbank', note: 'Brandenburg · Wohnen', maxF: 100000 },
  { name: 'IB Sachsen-Anhalt', ico: '🏛️', base: 2.80, typ: 'Förderbank', note: 'Sachsen-Anhalt', maxF: 100000 },
  { name: 'TAB Thüringen', ico: '🏛️', base: 2.78, typ: 'Förderbank', note: 'Thüringen · Wohneigentum', maxF: 100000 },
  { name: 'SAB Sachsen', ico: '🏛️', base: 2.72, typ: 'Förderbank', note: 'Sachsen · SAB-Wohnbau', maxF: 200000 },
  { name: 'ISB Rheinland-Pfalz', ico: '🏛️', base: 2.83, typ: 'Förderbank', note: 'RLP · Eigentumsförderung', maxF: 150000 },
  { name: 'IB Mecklenburg-Vorpommern', ico: '🏛️', base: 2.80, typ: 'Förderbank', note: 'MV · Wohnraumförderung', maxF: 100000 },
  { name: 'SIKB Saarland', ico: '🏛️', base: 2.85, typ: 'Förderbank', note: 'Saarland · Wohnbauförderung', maxF: 100000 },
]

function annuity(K, zinsPct, tilgPct, years) {
  const z = zinsPct / 100 / 12
  const n = years * 12
  if (z === 0) return K / n
  return K * z * Math.pow(1 + z, n) / (Math.pow(1 + z, n) - 1)
}

function adjustedRate(bank, kp, ek, lz) {
  let r = bank.base
  const ltv = (kp - ek) / kp
  if (ltv > 0.8) r += 0.3
  else if (ltv > 0.6) r += 0.1
  if (lz > 20) r += 0.25
  else if (lz > 15) r += 0.10
  return Math.max(r, 1.5)
}

export default function Bank() {
  const [tab, setTab] = useState('kredite')
  const [kredite, setKredite] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  // Vergleich-State
  const [kp, setKp] = useState(400000)
  const [ek, setEk] = useState(80000)
  const [tilg, setTilg] = useState(2.0)
  const [lz, setLz] = useState(20)
  const [filter, setFilter] = useState('Alle')

  const load = () => api.getKredite().then(setKredite)
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (form.id) await api.updateKredit(form.id, form)
      else await api.createKredit(form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Kredit löschen?')) return
    await api.deleteKredit(id); load()
  }

  const darlehen = kp - ek
  const typen = ['Alle', 'Großbank', 'Sparkasse', 'Direktbank', 'Vermittler', 'Bausparkasse', 'Hypothekenbank', 'KfW', 'Förderbank']
  const filtered = ALL_BANKS.filter(b => filter === 'Alle' || b.typ === filter)

  const gesamtRestschuld = kredite.reduce((s, k) => s + (k.restschuld || 0), 0)
  const gesamtRate = kredite.reduce((s, k) => s + (k.rate || 0), 0)
  const gesamtSumme = kredite.reduce((s, k) => s + (k.kreditsumme || 0), 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank & Finanzierung</h1>
          <p className="text-gray-500 text-sm mt-1">Kredite verwalten und Finanzierungen vergleichen</p>
        </div>
        {tab === 'kredite' && (
          <button className="btn-primary" onClick={() => setModal({ data: { ...EMPTY } })}>+ Kredit erfassen</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`btn ${tab === 'kredite' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('kredite')}>🏦 Meine Kredite</button>
        <button className={`btn ${tab === 'vergleich' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('vergleich')}>📊 Kreditvergleich</button>
      </div>

      {/* ── KREDITE TAB ── */}
      {tab === 'kredite' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">{fmt(gesamtSumme)}</p>
              <p className="text-sm text-gray-500 mt-1">Gesamtvolumen</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-orange-600">{fmt(gesamtRestschuld)}</p>
              <p className="text-sm text-gray-500 mt-1">Gesamte Restschuld</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-red-600">{fmt(gesamtRate)}</p>
              <p className="text-sm text-gray-500 mt-1">Monatliche Gesamtrate</p>
            </div>
          </div>

          {/* Tabelle */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Objekt</th>
                  <th>Kreditsumme</th>
                  <th>Restschuld</th>
                  <th>Zinsen</th>
                  <th>Tilgung</th>
                  <th>Mtl. Rate</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {kredite.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-gray-400 py-8">Noch keine Kredite erfasst</td></tr>
                ) : kredite.map(k => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.bank}</td>
                    <td className="text-gray-600">{k.objekt || '–'}</td>
                    <td>{fmt(k.kreditsumme)}</td>
                    <td className="text-orange-600 font-medium">{fmt(k.restschuld)}</td>
                    <td>{fmtP(k.zinsen)}</td>
                    <td>{fmtP(k.tilgung)}</td>
                    <td className="font-semibold text-red-600">{fmt(k.rate)}</td>
                    <td>
                      <span className={`badge ${k.status === 'aktiv' ? 'badge-green' : k.status === 'abgelöst' ? 'badge-gray' : 'badge-blue'}`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="space-x-2">
                      <button className="text-blue-500 hover:underline text-xs" onClick={() => setModal({ data: { ...k } })}>Bearbeiten</button>
                      <button className="text-red-500 hover:underline text-xs" onClick={() => del(k.id)}>Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VERGLEICH TAB ── */}
      {tab === 'vergleich' && (
        <>
          {/* Rechner */}
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">🔢 Finanzierungsrechner</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="form-label">Kaufpreis (€)</label>
                <input className="form-input" type="number" value={kp} onChange={e => setKp(+e.target.value)} />
              </div>
              <div>
                <label className="form-label">Eigenkapital (€)</label>
                <input className="form-input" type="number" value={ek} onChange={e => setEk(+e.target.value)} />
              </div>
              <div>
                <label className="form-label">Tilgung (%)</label>
                <input className="form-input" type="number" step="0.1" value={tilg} onChange={e => setTilg(+e.target.value)} />
              </div>
              <div>
                <label className="form-label">Laufzeit (Jahre)</label>
                <input className="form-input" type="number" value={lz} onChange={e => setLz(+e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg text-center">
              <div>
                <p className="text-xs text-gray-500">Darlehensbetrag</p>
                <p className="text-xl font-bold text-blue-700">{fmt(darlehen)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">EK-Quote</p>
                <p className="text-xl font-bold text-green-700">{kp > 0 ? ((ek / kp) * 100).toFixed(1) : 0} %</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Beleihungsauslauf</p>
                <p className="text-xl font-bold text-orange-700">{kp > 0 ? (((kp - ek) / kp) * 100).toFixed(1) : 0} %</p>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {typen.map(t => (
              <button key={t} className={`px-3 py-1 rounded-full text-sm border transition-colors ${filter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                onClick={() => setFilter(t)}>{t}</button>
            ))}
          </div>

          {/* Banken-Tabelle */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Institut</th>
                  <th>Typ</th>
                  <th>Eff. Zinssatz</th>
                  <th>Mtl. Rate</th>
                  <th>Förderbetrag</th>
                  <th>Hinweis</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const rate = annuity(darlehen, adjustedRate(b, kp, ek, lz), tilg, lz)
                  const adjRate = adjustedRate(b, kp, ek, lz)
                  const isF = b.typ === 'Förderbank'
                  const isKfw = b.typ === 'KfW'
                  return (
                    <tr key={i} className={isF ? 'bg-green-50' : isKfw ? 'bg-blue-50' : ''}>
                      <td className="font-medium">{b.ico} {b.name}</td>
                      <td>
                        <span className={`badge ${isF ? 'badge-green' : isKfw ? 'badge-blue' : 'badge-gray'}`}>{b.typ}</span>
                      </td>
                      <td className="font-semibold text-blue-700">{fmtP(adjRate)}</td>
                      <td className="font-semibold">{fmt(rate)}</td>
                      <td className="text-green-700 font-semibold">
                        {isF ? `bis ${fmt(b.maxF)}` : isKfw ? 'nach Programm' : '–'}
                      </td>
                      <td className="text-gray-500 text-xs">{b.note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">* Zinssätze sind Richtwerte. Tatsächliche Konditionen hängen von Bonität, Objekt und Marktlage ab.</p>
        </>
      )}

      {/* Modal */}
      {modal && <KreditModal data={modal.data} onClose={() => setModal(null)} onSave={save} saving={saving} />}
    </div>
  )
}

function KreditModal({ data, onClose, onSave, saving }) {
  const [form, setForm] = useState(data)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-Rate berechnen
  useEffect(() => {
    if (form.kreditsumme && form.zinsen && form.tilgung && form.laufzeit) {
      const rate = annuity(+form.kreditsumme, +form.zinsen, +form.tilgung, +form.laufzeit)
      setForm(f => ({ ...f, rate: Math.round(rate) }))
    }
  }, [form.kreditsumme, form.zinsen, form.tilgung, form.laufzeit])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">{form.id ? 'Kredit bearbeiten' : 'Kredit erfassen'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Bank / Institut *</label>
              <input className="form-input" value={form.bank} onChange={e => set('bank', e.target.value)} placeholder="z.B. Sparkasse München" />
            </div>
            <div>
              <label className="form-label">Objekt</label>
              <input className="form-input" value={form.objekt} onChange={e => set('objekt', e.target.value)} placeholder="z.B. Musterstr. 10" />
            </div>
            <div>
              <label className="form-label">Zweck</label>
              <input className="form-input" value={form.zweck} onChange={e => set('zweck', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Kreditsumme (€) *</label>
              <input className="form-input" type="number" value={form.kreditsumme} onChange={e => set('kreditsumme', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Restschuld (€)</label>
              <input className="form-input" type="number" value={form.restschuld} onChange={e => set('restschuld', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Zinsen (% p.a.)</label>
              <input className="form-input" type="number" step="0.01" value={form.zinsen} onChange={e => set('zinsen', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Tilgung (% p.a.)</label>
              <input className="form-input" type="number" step="0.1" value={form.tilgung} onChange={e => set('tilgung', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Laufzeit (Jahre)</label>
              <input className="form-input" type="number" value={form.laufzeit} onChange={e => set('laufzeit', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Startdatum</label>
              <input className="form-input" type="date" value={form.startdatum} onChange={e => set('startdatum', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Mtl. Rate (€) <span className="text-blue-500 text-xs">(auto)</span></label>
              <input className="form-input bg-blue-50" type="number" value={form.rate} onChange={e => set('rate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="aktiv">Aktiv</option>
                <option value="abgelöst">Abgelöst</option>
                <option value="geplant">Geplant</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Notizen</label>
              <textarea className="form-input" rows={2} value={form.notizen} onChange={e => set('notizen', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.bank || !form.kreditsumme} onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
