import React, { useEffect, useState, useRef } from 'react'
import { api } from '../api'

const CATEGORIES = ['Mietvertrag', 'Nebenkostenabrechnung', 'Korrespondenz', 'Versicherung', 'Rechnung', 'Protokoll', 'Sonstiges']

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [category, setCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const load = () => api.getDocuments(category ? { category } : {}).then(setDocs)
  useEffect(() => { load() }, [category])

  const upload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', file.name)
    fd.append('category', category || 'Sonstiges')
    setUploading(true)
    try {
      await api.uploadDocument(fd)
      load()
      fileRef.current.value = ''
    } finally { setUploading(false) }
  }

  const del = async (id) => {
    if (!confirm('Dokument löschen?')) return
    await api.deleteDocument(id); load()
  }

  const fmtSize = (b) => {
    if (!b) return '–'
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  const icon = (name) => {
    const ext = name?.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(ext)) return '📄'
    if (['doc', 'docx'].includes(ext)) return '📝'
    if (['xls', 'xlsx'].includes(ext)) return '📊'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️'
    return '📁'
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dokumente</h1>
          <p className="text-gray-500 text-sm mt-1">{docs.length} Dokument{docs.length !== 1 ? 'e' : ''}</p>
        </div>
        <div className="flex gap-3 items-center">
          <select className="form-select w-44" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Alle Kategorien</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <label className={`btn-primary cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            {uploading ? 'Lädt hoch...' : '+ Hochladen'}
            <input ref={fileRef} type="file" className="hidden" onChange={upload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" />
          </label>
        </div>
      </div>

      {/* Upload-Bereich */}
      <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
        <p className="text-3xl mb-2">📤</p>
        <p className="text-gray-500">Datei hierher ziehen oder klicken zum Hochladen</p>
        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Bilder – max. 10 MB</p>
        <input ref={fileRef} type="file" className="hidden" onChange={upload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" />
      </label>

      {/* Kategorien-Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategory('')} className={`badge cursor-pointer ${!category ? 'badge-blue' : 'badge-gray'}`}>Alle</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`badge cursor-pointer ${category === c ? 'badge-blue' : 'badge-gray'}`}>{c}</button>
        ))}
      </div>

      {docs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-gray-500">Keine Dokumente vorhanden</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {docs.map(d => (
            <div key={d.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">{icon(d.filename)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.category} · {fmtSize(d.size)}</p>
                  <p className="text-xs text-gray-400">{d.created_at?.split('T')[0]}</p>
                </div>
              </div>
              {d.notes && <p className="text-sm text-gray-500 mt-2">{d.notes}</p>}
              <div className="flex gap-2 mt-3">
                <a href={`/api/documents/download/${d.filename}`} download={d.name}
                  className="btn-secondary text-xs flex-1 text-center">⬇️ Herunterladen</a>
                <button className="btn text-xs text-red-600 hover:bg-red-50 border border-red-200" onClick={() => del(d.id)}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
