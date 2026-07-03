import React, { useEffect, useState } from 'react'
import { api } from '../api'

const TYPES = [
  { value: 'email', label: '📧 E-Mail' },
  { value: 'brief', label: '✉️ Brief' },
  { value: 'sms', label: '📱 SMS' },
  { value: 'notiz', label: '📝 Interne Notiz' },
]

const EMPTY = { tenant_id: '', type: 'email', subject: '', content: '' }

export default function Messages() {
  const [messages, setMessages] = useState([])
  const [tenants, setTenants] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = () => Promise.all([api.getMessages(), api.getTenants()])
    .then(([m, t]) => { setMessages(m); setTenants(t) })
  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      await api.createMessage(form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Nachricht löschen?')) return
    await api.deleteMessage(id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  const typeIcon = (t) => TYPES.find(x => x.value === t)?.label.split(' ')[0] || '📨'
  const typeLabel = (t) => TYPES.find(x => x.value === t)?.label.split(' ')[1] || t

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kommunikation</h1>
          <p className="text-gray-500 text-sm mt-1">Briefe, E-Mails & SMS an Mieter</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ data: { ...EMPTY } })}>+ Nachricht erstellen</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Liste */}
        <div className="lg:col-span-1 space-y-2">
          {messages.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-3xl mb-2">✉️</p>
              <p className="text-gray-500 text-sm">Noch keine Nachrichten</p>
            </div>
          ) : messages.map(m => (
            <div key={m.id}
              onClick={() => setSelected(m)}
              className={`card cursor-pointer hover:shadow-md transition-all ${selected?.id === m.id ? 'border-blue-400 bg-blue-50' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{typeIcon(m.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.subject}</p>
                  <p className="text-xs text-gray-500">{m.tenant_name || 'Allgemein'}</p>
                  <p className="text-xs text-gray-400">{m.sent_at?.split('T')[0]}</p>
                </div>
                <span className="badge-gray text-xs">{typeLabel(m.type)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="card h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.subject}</h2>
                  <p className="text-sm text-gray-500">
                    {typeIcon(selected.type)} {typeLabel(selected.type)} · {selected.tenant_name || 'Allgemein'} · {selected.sent_at?.split('T')[0]}
                  </p>
                </div>
                <button onClick={() => del(selected.id)} className="text-red-500 hover:underline text-sm">Löschen</button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-800">
                {selected.content}
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center h-64 text-center">
              <div>
                <p className="text-4xl mb-3">📬</p>
                <p className="text-gray-500">Wähle eine Nachricht aus</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Nachricht erstellen" onClose={() => setModal(null)} onSave={save}
          initial={modal.data} tenants={tenants} saving={saving} />
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, initial, tenants, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const templates = {
    email: `Sehr geehrte/r [Mieter],\n\nhiermit möchten wir Sie über folgendes informieren:\n\n[Inhalt]\n\nMit freundlichen Grüßen\n[Ihr Vermieter]`,
    brief: `[Ort], den [Datum]\n\nBetr.: [Betreff]\n\nSehr geehrte/r [Mieter],\n\n[Inhalt]\n\nMit freundlichen Grüßen\n\n[Unterschrift]`,
    sms: `Guten Tag [Mieter], [Inhalt]. Bei Fragen: [Telefon]`,
  }

  const applyTemplate = () => {
    const t = templates[form.type]
    if (t) set('content', t)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Empfänger</label>
              <select className="form-select" value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
                <option value="">Alle / Allgemein</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Art</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Betreff *</label>
              <input className="form-input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="z.B. Mieterhöhung ab 01.01.2027" />
            </div>
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0">Inhalt *</label>
                <button type="button" onClick={applyTemplate} className="text-xs text-blue-600 hover:underline">Vorlage einfügen</button>
              </div>
              <textarea className="form-input" rows={8} value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder="Nachrichtentext eingeben..." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={saving || !form.subject || !form.content} onClick={() => onSave(form)}>
            {saving ? 'Speichern...' : '✉️ Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
