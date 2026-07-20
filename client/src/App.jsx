import React, { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import LicenseExpired from './pages/LicenseExpired'
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
import Bank from './pages/Bank'
import Admin from './pages/Admin'

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
  { to: '/bank', icon: '🏦', label: 'Bank & Kredit' },
]

function AppShell() {
  const { user, loading, licenseExpired, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Laden...</div>
      </div>
    )
  }

  if (!user) return <Login />
  if (licenseExpired) return <LicenseExpired />

  const daysLeft = user.license_expires_at && user.role !== 'admin'
    ? Math.ceil((new Date(user.license_expires_at) - new Date()) / 86400000)
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-slate-900 text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <span className="text-2xl">🏠</span>
          {sidebarOpen && <span className="font-bold text-lg tracking-tight">ImmoApp</span>}
        </div>

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-2
                ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <span className="text-lg flex-shrink-0">{icon}</span>
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}

          {user.role === 'admin' && (
            <NavLink to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-2 mt-2 border-t border-slate-700 pt-4
                ${isActive ? 'bg-yellow-600 text-white' : 'text-yellow-400 hover:bg-slate-800'}`
              }
            >
              <span className="text-lg flex-shrink-0">⚙️</span>
              {sidebarOpen && <span>Admin</span>}
            </NavLink>
          )}
        </nav>

        {/* User Info + Logout */}
        <div className="border-t border-slate-700 px-4 py-3">
          {sidebarOpen && (
            <div className="mb-2">
              <p className="text-xs text-slate-400 truncate">{user.username}</p>
              {daysLeft !== null && (
                <p className={`text-xs ${daysLeft <= 30 ? 'text-yellow-400' : 'text-slate-500'}`}>
                  Lizenz: {daysLeft} Tage
                </p>
              )}
            </div>
          )}
          <button onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full">
            <span>🚪</span>
            {sidebarOpen && <span>Abmelden</span>}
          </button>
        </div>

        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-4 py-4 text-slate-400 hover:text-white border-t border-slate-700 text-sm">
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
          <Route path="/bank" element={<Bank />} />
          {user.role === 'admin' && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
