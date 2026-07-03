import React, { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import Units from './pages/Units'
import Tenants from './pages/Tenants'
import Leases from './pages/Leases'
import Finances from './pages/Finances'
import MeterReadings from './pages/MeterReadings'
import UtilityBilling from './pages/UtilityBilling'
import Documents from './pages/Documents'
import Messages from './pages/Messages'
import Costs from './pages/Costs'
import Owners from './pages/Owners'

const NAV = [
  { to: '/', icon: '📊', label: 'Dashboard', end: true },
  { to: '/objekte', icon: '🏢', label: 'Objekte' },
  { to: '/einheiten', icon: '🚪', label: 'Einheiten' },
  { to: '/mieter', icon: '👥', label: 'Mieter' },
  { to: '/mietvertraege', icon: '📄', label: 'Mietverträge' },
  { to: '/finanzen', icon: '💶', label: 'Finanzen' },
  { to: '/zaehlerstaende', icon: '⚡', label: 'Zählerstände' },
  { to: '/nebenkosten', icon: '🧾', label: 'Nebenkosten' },
  { to: '/dokumente', icon: '📁', label: 'Dokumente' },
  { to: '/kommunikation', icon: '✉️', label: 'Kommunikation' },
  { to: '/kosten', icon: '💸', label: 'Kosten' },
  { to: '/eigentuemer', icon: '👤', label: 'Eigentümer' },
]

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-slate-900 text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <span className="text-2xl">🏠</span>
          {sidebarOpen && <span className="font-bold text-lg tracking-tight">ImmoApp</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-2
                ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <span className="text-lg flex-shrink-0">{icon}</span>
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-4 py-4 text-slate-400 hover:text-white border-t border-slate-700 text-sm"
        >
          <span>{sidebarOpen ? '◀' : '▶'}</span>
          {sidebarOpen && <span>Einklappen</span>}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/objekte" element={<Properties />} />
          <Route path="/einheiten" element={<Units />} />
          <Route path="/mieter" element={<Tenants />} />
          <Route path="/mietvertraege" element={<Leases />} />
          <Route path="/finanzen" element={<Finances />} />
          <Route path="/zaehlerstaende" element={<MeterReadings />} />
          <Route path="/nebenkosten" element={<UtilityBilling />} />
          <Route path="/dokumente" element={<Documents />} />
          <Route path="/kommunikation" element={<Messages />} />
          <Route path="/kosten" element={<Costs />} />
          <Route path="/eigentuemer" element={<Owners />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
