import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Lade Dashboard...</div>

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Übersicht deiner Immobilien</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏢" label="Objekte" value={data?.properties ?? 0} color="bg-blue-50" />
        <StatCard icon="🚪" label="Einheiten" value={data?.units ?? 0} color="bg-green-50" />
        <StatCard icon="👥" label="Mieter" value={data?.tenants ?? 0} color="bg-yellow-50" />
        <StatCard icon="💶" label="Monatl. Miete" value={fmt(data?.monthly_rent)} color="bg-purple-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Letzte Zahlungen */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Letzte Zahlungen</h2>
          {data?.recent_payments?.length === 0 ? (
            <p className="text-gray-400 text-sm">Noch keine Zahlungen</p>
          ) : (
            <div className="space-y-3">
              {data?.recent_payments?.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{p.tenant_name}</p>
                    <p className="text-xs text-gray-500">{p.unit_name} · {p.date}</p>
                  </div>
                  <span className="font-semibold text-green-600">{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fehlende Mietzahlungen */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">⚠️ Miete ausstehend (akt. Monat)</h2>
          {data?.overdue_payments?.length === 0 ? (
            <p className="text-green-600 text-sm font-medium">✅ Alle Mieter haben gezahlt</p>
          ) : (
            <div className="space-y-3">
              {data?.overdue_payments?.map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{l.tenant_name}</p>
                    <p className="text-xs text-gray-500">{l.unit_name} · {l.property_name}</p>
                  </div>
                  <span className="badge-red">Ausstehend</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schnellzugriff */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🏢', label: 'Objekt anlegen', href: '/objekte' },
            { icon: '👤', label: 'Mieter anlegen', href: '/mieter' },
            { icon: '📄', label: 'Vertrag anlegen', href: '/mietvertraege' },
            { icon: '💶', label: 'Zahlung erfassen', href: '/finanzen' },
          ].map(q => (
            <a key={q.href} href={q.href} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
              <span className="text-2xl">{q.icon}</span>
              <span className="text-xs font-medium text-gray-700">{q.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
  )
}
