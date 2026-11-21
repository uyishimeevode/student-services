import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  Download,
  FileText,
  GraduationCap,
  House,
  IdCard,
  Inbox,
  KeyRound,
  LibraryBig,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  NotebookPen,
  Presentation,
  Receipt,
  ScrollText,
  Search,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { initials } from '../api/client'
import { ROLE_LABELS, type Permission, type Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  permission?: Permission
}

interface NavSection {
  title: string
  items: NavItem[]
}

const dashboard: NavItem = { to: '/', label: 'Dashboard', icon: House }

/** Each role gets its own menu, named the way that role talks about its work. */
const MENUS: Record<Role, NavSection[]> = {
  STUDENT: [
    { title: 'Dashboard', items: [dashboard, { to: '/me', label: 'Personal Profile', icon: IdCard }] },
    {
      title: 'Academics',
      items: [
        { to: '/my/courses', label: 'Module Registration', icon: BookOpen },
        { to: '/my/grades', label: 'My Results', icon: NotebookPen },
        { to: '/my/requests', label: 'Academic Requisition', icon: MessageSquareText },
      ],
    },
    {
      title: 'Financials',
      items: [
        { to: '/my/fees', label: 'Fee Statement', icon: Wallet },
        { to: '/my/receipts', label: 'Receipts', icon: Receipt },
      ],
    },
    {
      title: 'Examination',
      items: [
        { to: '/exam/cat-card', label: 'CAT Card', icon: Download },
        { to: '/exam/exam-card', label: 'Exam Card', icon: Download },
        { to: '/exam/transcript', label: 'Provisional Transcript', icon: ScrollText },
      ],
    },
  ],
  LECTURER: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/classes', label: 'My Courses', icon: BookOpen },
        { to: '/classes?view=attendance', label: 'Attendance', icon: CalendarDays },
        { to: '/classes?view=grades', label: 'Gradebook', icon: FileText },
        { to: '/classes?view=materials', label: 'Course Materials', icon: Download },
      ],
    },
  ],
  HEAD_OF_DEPARTMENT: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/courses?tab=catalogue', label: 'Programmes', icon: BookOpen },
        { to: '/courses', label: 'Faculty', icon: Users },
        { to: '/approvals', label: 'Grade Approvals', icon: Check },
        { to: '/reports', label: 'Department Reports', icon: FileText },
      ],
    },
    {
      title: 'Teaching',
      items: [
        { to: '/students', label: 'Students', icon: GraduationCap },
        { to: '/classes', label: 'My Classes', icon: Presentation },
      ],
    },
  ],
  DEAN: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/reports', label: 'Faculty Overview', icon: House },
        { to: '/structure', label: 'Departments', icon: Users },
        { to: '/students', label: 'Students', icon: GraduationCap },
        { to: '/reports?export=1', label: 'Faculty Reports', icon: FileText },
      ],
    },
  ],
  ADMISSIONS_OFFICER: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/applications', label: 'Applications', icon: FileText },
        { to: '/applications?status=UNDER_REVIEW', label: 'Document Review', icon: Check },
        { to: '/applications?status=OFFERED', label: 'Offers', icon: Bell },
        { to: '/applications?status=ENROLLED', label: 'Enrollment Pipeline', icon: Users },
        { to: '/students/new', label: 'Register Student', icon: UserPlus },
      ],
    },
  ],
  REGISTRAR: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/students', label: 'Student Records', icon: Users },
        { to: '/terms', label: 'Registration Management', icon: BookOpen },
        { to: '/requests?type=TRANSCRIPT', label: 'Transcripts', icon: FileText },
        { to: '/requests', label: 'Service Requests', icon: Inbox },
      ],
    },
    {
      title: 'Academics',
      items: [
        { to: '/students/new', label: 'Register Student', icon: UserPlus },
        { to: '/courses', label: 'Courses', icon: LibraryBig },
        { to: '/structure', label: 'Academic Structure', icon: Building2 },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ],
  FINANCE_OFFICER: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/finance?tab=invoices', label: 'Invoices', icon: FileText },
        { to: '/finance?tab=payments', label: 'Payments', icon: Wallet },
        { to: '/finance?tab=waivers', label: 'Scholarships & Waivers', icon: Check },
        { to: '/finance?tab=report', label: 'Reconciliation', icon: Download },
        { to: '/students', label: 'Students', icon: GraduationCap },
      ],
    },
  ],
  STUDENT_SERVICES_OFFICER: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/requests', label: 'Service Requests', icon: Inbox },
        { to: '/requests?type=LETTER', label: 'Letters', icon: FileText },
        { to: '/requests?type=APPOINTMENT', label: 'Appointments', icon: CalendarDays },
        { to: '/requests?type=TRANSCRIPT', label: 'Transcripts', icon: ScrollText },
        { to: '/students', label: 'Students', icon: GraduationCap },
      ],
    },
  ],
  SYSTEM_ADMINISTRATOR: [
    {
      title: 'Main menu',
      items: [
        dashboard,
        { to: '/users', label: 'Users & Access', icon: Users },
        { to: '/roles', label: 'Roles & Permissions', icon: Check },
        { to: '/structure', label: 'System Settings', icon: Building2 },
        { to: '/audit', label: 'Audit Logs', icon: FileText },
      ],
    },
  ],
}

/** The menu entry that best matches the current address: exact path and query first, then path alone, then the parent path. */
function activeItem(items: NavItem[], pathname: string, search: string): string | undefined {
  const full = pathname + search
  const exact = items.find((i) => i.to === full)
  if (exact) return exact.to
  const samePath = items.find((i) => i.to === pathname)
  if (samePath) return samePath.to
  const parent = items
    .filter((i) => i.to !== '/' && pathname.startsWith(i.to.split('?')[0] + '/'))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return parent?.to
}

const PAGE_TITLES: [RegExp, string][] = [
  [/^\/$/, 'Dashboard'],
  [/^\/me$/, 'Personal Profile'],
  [/^\/students\/new$/, 'Register Student'],
  [/^\/students\/[^/]+$/, 'Student Record'],
  [/^\/students$/, 'Students'],
  [/^\/structure$/, 'Academic Structure'],
  [/^\/users$/, 'User Roles'],
  [/^\/audit$/, 'Audit Log'],
  [/^\/change-password$/, 'Change Password'],
  [/^\/my\/courses$/, 'Module Registration'],
  [/^\/my\/grades$/, 'My Grades'],
  [/^\/my\/fees$/, 'My Fees'],
  [/^\/my\/requests$/, 'My Requests'],
  [/^\/classes$/, 'My Classes'],
  [/^\/classes\/[^/]+$/, 'Class'],
  [/^\/approvals$/, 'Grade Approvals'],
  [/^\/applications$/, 'Applications'],
  [/^\/finance$/, 'Finance'],
  [/^\/requests$/, 'Service Requests'],
  [/^\/courses$/, 'Courses'],
  [/^\/terms$/, 'Academic Terms'],
  [/^\/reports$/, 'Reports'],
  [/^\/my\/receipts$/, 'Receipts'],
  [/^\/exam\/cat-card$/, 'CAT Card'],
  [/^\/exam\/exam-card$/, 'Exam Card'],
  [/^\/exam\/transcript$/, 'Provisional Transcript'],
  [/^\/roles$/, 'Roles & Permissions'],
]

export function Layout() {
  const { user, can, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  if (!user) return null

  const sections = MENUS[user.role]
    .map((section) => ({ ...section, items: section.items.filter((i) => !i.permission || can(i.permission)) }))
    .filter((section) => section.items.length > 0)
  const active = activeItem(
    sections.flatMap((section) => section.items),
    location.pathname,
    location.search,
  )
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

        <nav>
          {sections.map((section) => (
            <div key={section.title} className="nav-section">
              <span className="nav-label">{section.title.toUpperCase()}</span>
              {section.items.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className={to === active ? 'active' : ''} aria-current={to === active ? 'page' : undefined}>
                  <Icon size={20} strokeWidth={1.75} />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user.role === 'STUDENT' && (
            <NavLink to="/my/requests" end>
              <LifeBuoy size={20} strokeWidth={1.75} />
              Help & Support
            </NavLink>
          )}
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
          {/* Remount the page when the query changes, so menu entries like ?tab=... open the right view. */}
          <div key={location.pathname + location.search}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
