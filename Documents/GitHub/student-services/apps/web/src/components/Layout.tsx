import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  GraduationCap,
  House,
  IdCard,
  KeyRound,
  LogOut,
  ScrollText,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { initials } from '../api/client'
import { ROLE_LABELS, type Permission, type Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  permission?: Permission
  role?: Role
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: House, end: true },
  { to: '/me', label: 'My Record', icon: IdCard, role: 'STUDENT' },
  { to: '/students', label: 'Students', icon: GraduationCap, end: true, permission: 'students.view' },
  { to: '/students/new', label: 'Register Student', icon: UserPlus, permission: 'students.register' },
  { to: '/structure', label: 'Academic Structure', icon: Building2, permission: 'structure.view' },
  { to: '/users', label: 'User Roles', icon: ShieldCheck, permission: 'users.manage' },
  { to: '/audit', label: 'Audit Log', icon: ScrollText, permission: 'audit.view' },
]

const PAGE_TITLES: [RegExp, string][] = [
  [/^\/$/, 'Dashboard'],
  [/^\/me$/, 'My Record'],
  [/^\/students\/new$/, 'Register Student'],
  [/^\/students\/[^/]+$/, 'Student Record'],
  [/^\/students$/, 'Students'],
  [/^\/structure$/, 'Academic Structure'],
  [/^\/users$/, 'User Roles'],
  [/^\/audit$/, 'Audit Log'],
  [/^\/change-password$/, 'Change Password'],
]

export function Layout() {
  const { user, can, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  if (!user) return null

  const items = NAV.filter((item) => (!item.permission || can(item.permission)) && (!item.role || item.role === user.role))
  const title = PAGE_TITLES.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? ''

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const term = search.trim()
    navigate(term ? `/students?search=${encodeURIComponent(term)}` : '/students')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <span>SS</span>
          </span>
          <span className="brand-text">
            <strong>STUDENT</strong>
            <small>SERVICES PORTAL</small>
          </span>
        </div>

        <span className="nav-label">MAIN MENU</span>
        <nav>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={20} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/change-password">
            <KeyRound size={20} strokeWidth={1.75} />
            Change Password
          </NavLink>
          <button type="button" className="nav-button" onClick={signOut}>
            <LogOut size={20} strokeWidth={1.75} />
            Log out
          </button>
          <div className="user-card">
            <span className="avatar">{initials(user.fullName)}</span>
            <span className="user-meta">
              <strong>{user.fullName}</strong>
              <small>{ROLE_LABELS[user.role]}</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Student Services</span>
            <span className="sep">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            {can('students.view') && (
              <form className="search" onSubmit={submitSearch} role="search">
                <Search size={18} strokeWidth={1.75} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students"
                  aria-label="Search students"
                />
              </form>
            )}
            <span className="avatar large" title={user.fullName}>
              {initials(user.fullName)}
            </span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
