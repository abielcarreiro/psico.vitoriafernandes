/**
 * Estrutura do painel administrativo: autenticação simples + navegação lateral.
 */
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, ExternalLink, LayoutDashboard, Leaf, LogOut, Menu, Settings, Users, Wallet, X } from 'lucide-react'
import { useStore } from '../../context/AppStore'
import { Avatar } from '../../components/ui'
import Login from './Login'

const AUTH_KEY = 'psico-agenda:auth'

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Visão geral' },
  { to: '/admin/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/admin/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/admin/financeiro', icon: Wallet, label: 'Financeiro' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
]

export default function AdminLayout() {
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1'
    } catch {
      return false
    }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const { settings, appointments } = useStore()
  const location = useLocation()
  const pendingCount = appointments.filter((a) => a.status === 'pendente').length

  const login = () => {
    try {
      sessionStorage.setItem(AUTH_KEY, '1')
    } catch { /* ignora */ }
    setAuthed(true)
  }
  const logout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY)
    } catch { /* ignora */ }
    setAuthed(false)
  }

  if (!authed) return <Login onLogin={login} />

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Painel">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive ? 'bg-white text-sage-800 shadow-soft' : 'text-sage-100 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <n.icon size={18} />
          {n.label}
          {n.to === '/admin' && pendingCount > 0 && (
            <span className="ml-auto rounded-full bg-clay-500 px-2 py-0.5 text-xs text-white" aria-label={`${pendingCount} solicitações pendentes`}>
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const sidebar = (
    <div className="flex h-full flex-col bg-sage-800 p-4">
      <div className="mb-8 flex items-center gap-2.5 px-2 pt-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-sage-600 text-cream-50 ring-1 ring-white/10">
          <Leaf size={18} />
        </span>
        <span className="leading-tight text-white">
          <span className="block font-display text-lg">Consultório</span>
          <span className="block text-[11px] font-medium uppercase tracking-widest text-sage-300">Painel clínico</span>
        </span>
      </div>
      {nav}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
        <a href="#/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sage-100 hover:bg-white/10">
          <ExternalLink size={18} /> Ver página pública
        </a>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sage-100 hover:bg-white/10">
          <LogOut size={18} /> Sair
        </button>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <Avatar name={settings.psychologist.name.replace('Dra. ', '')} size="sm" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{settings.psychologist.name}</p>
            <p className="truncate text-xs text-sage-300">{settings.psychologist.crp}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream-50 lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-sage-100 bg-cream-50/90 px-4 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2 font-display text-lg"><Leaf size={18} className="text-sage-600" /> Consultório</span>
        <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2" aria-label="Abrir menu">
          <Menu size={22} />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-sage-900/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-in">
            {sidebar}
            <button onClick={() => setMenuOpen(false)} className="absolute top-5 right-4 rounded-lg p-1.5 text-white hover:bg-white/10" aria-label="Fechar menu">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <main key={location.pathname} className="min-w-0 animate-fade-up px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
