import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CircleCheck,
  GraduationCap,
  IdCard,
  KeyRound,
  Layers,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, initials } from '../api/client'
import { ROLE_LABELS, type DashboardData, type Role, type StudentStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice } from '../components/Field'

type Tone = 'green' | 'amber' | 'blue' | 'purple'

interface StatCard {
  label: string
  value: string | number
  hint: string
  icon: LucideIcon
  tone: Tone
}

interface QueueItem {
  key: string
  title: ReactNode
  meta: string
  badge?: { label: string; tone: string }
  to?: string
}

interface Queue {
  title: string
  viewAll?: string
  items: QueueItem[]
  empty: string
}

const ROLE_SUBTITLES: Record<Role, string> = {
  STUDENT: 'Follow your registration, programme and status.',
  LECTURER: 'Your classes, attendance and grades will appear here as those modules are released.',
  HEAD_OF_DEPARTMENT: 'Oversee students and programmes in your department.',
  DEAN: 'Oversee students and departments across your faculty.',
  ADMISSIONS_OFFICER: 'Register admitted students and follow new intakes.',
  REGISTRAR: 'Manage registration, official student records and status changes.',
  FINANCE_OFFICER: 'Look up student records. Invoices and payments arrive with the fees module.',
  STUDENT_SERVICES_OFFICER: 'Look up student records. Requests and appointments arrive with the requests module.',
  SYSTEM_ADMINISTRATOR: 'Manage accounts, roles, academic structure and the audit trail.',
}

const STATUS_TONE: Record<StudentStatus, string> = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  WITHDRAWN: 'withdrawn',
  GRADUATED: 'graduated',
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function statCards(data: DashboardData): StatCard[] {
  if (data.myRecord) {
    const r = data.myRecord
    return [
      { label: 'Registration', value: r.registrationNumber ?? '-', hint: `Intake ${r.intakeYear}`, icon: IdCard, tone: 'green' },
      { label: 'Programme', value: r.program.code, hint: r.program.name, icon: BookOpen, tone: 'amber' },
      { label: 'Year of study', value: `${r.yearOfStudy} / ${r.program.durationYears}`, hint: 'Current year', icon: CalendarDays, tone: 'blue' },
      { label: 'Status', value: titleCase(r.status), hint: 'Registry status', icon: CircleCheck, tone: 'purple' },
    ]
  }
  if (data.students) {
    const s = data.students
    const inactive = s.byStatus.SUSPENDED + s.byStatus.WITHDRAWN
    return [
      { label: 'Students', value: s.total, hint: `${s.byProgram.length} ${s.byProgram.length === 1 ? 'programme' : 'programmes'}`, icon: GraduationCap, tone: 'green' },
      { label: `${s.currentIntakeYear} intake`, value: s.currentIntake, hint: 'Registered this year', icon: UserPlus, tone: 'amber' },
      { label: 'Active', value: s.byStatus.ACTIVE, hint: `${s.byStatus.GRADUATED} graduated`, icon: CircleCheck, tone: 'blue' },
      { label: 'Needs attention', value: inactive, hint: 'Suspended or withdrawn', icon: TriangleAlert, tone: 'purple' },
    ]
  }
  if (data.users) {
    const u = data.users
    return [
      { label: 'Active accounts', value: u.active, hint: 'Can sign in', icon: Users, tone: 'green' },
      { label: 'Password pending', value: u.pendingPasswordChange, hint: 'Temporary password in use', icon: KeyRound, tone: 'amber' },
      { label: 'Inactive', value: u.inactive, hint: 'Deactivated accounts', icon: UserX, tone: 'blue' },
      { label: 'Programmes', value: data.structure?.programs ?? 0, hint: `${data.structure?.departments ?? 0} departments`, icon: Layers, tone: 'purple' },
    ]
  }
  const st = data.structure
  return [
    { label: 'Faculties', value: st?.faculties ?? 0, hint: 'In the institution', icon: Building2, tone: 'green' },
    { label: 'Departments', value: st?.departments ?? 0, hint: 'Across faculties', icon: Layers, tone: 'amber' },
    { label: 'Programmes', value: st?.programs ?? 0, hint: 'On offer', icon: BookOpen, tone: 'blue' },
    { label: 'Classes', value: '-', hint: 'Coming with teaching module', icon: CalendarDays, tone: 'purple' },
  ]
}

function workQueue(data: DashboardData): Queue {
  if (data.students?.recent) {
    return {
      title: 'Latest registrations',
      viewAll: '/students',
      empty: 'No students registered yet.',
      items: data.students.recent.map((s) => ({
        key: s.id,
        title: `${s.firstName} ${s.lastName}`,
        meta: `${s.registrationNumber ?? 'Pending number'} · ${s.program.code} · ${shortDate(s.createdAt)}`,
        badge: { label: 'Registered', tone: 'active' },
        to: `/students/${s.id}`,
      })),
    }
  }
  if (data.students) {
    return {
      title: 'Students by programme',
      viewAll: '/students',
      empty: 'No students in your scope yet.',
      items: data.students.byProgram.map((p) => ({
        key: p.programId,
        title: p.name ?? p.code ?? 'Programme',
        meta: `${p.code ?? ''} · ${p.count} ${p.count === 1 ? 'student' : 'students'}`,
        to: `/students`,
      })),
    }
  }
  if (data.recentActivity) {
    return {
      title: 'Recent activity',
      viewAll: '/audit',
      empty: 'No activity recorded yet.',
      items: data.recentActivity.map((a) => ({
        key: a.id,
        title: titleCase(a.action.replace(/[._]/g, ' ')),
        meta: `${a.actor?.fullName ?? 'System'} · ${shortDate(a.createdAt)}`,
        badge: { label: titleCase(a.entity), tone: 'graduated' },
      })),
    }
  }
  if (data.myRecord) {
    return {
      title: 'Your record',
      viewAll: '/me',
      empty: '',
      items: [
        {
          key: 'record',
          title: 'Check your personal details',
          meta: 'Tell the Registrar if anything is wrong',
          badge: { label: titleCase(data.myRecord.status), tone: STATUS_TONE[data.myRecord.status] },
          to: '/me',
        },
        { key: 'courses', title: 'Course registration', meta: 'Opens with the courses module', badge: { label: 'Upcoming', tone: 'suspended' } },
        { key: 'fees', title: 'School fees', meta: 'Opens with the fees module', badge: { label: 'Upcoming', tone: 'suspended' } },
      ],
    }
  }
  return { title: 'Priorities', empty: 'Nothing needs your attention right now.', items: [] }
}

export function DashboardPage() {
  const { user, can } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<DashboardData>('/dashboard')
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  if (!user) return null

  const actions = [
    user.role === 'STUDENT' && { to: '/me', label: 'View my record', icon: IdCard },
    can('students.register') && { to: '/students/new', label: 'Register student', icon: UserPlus },
    can('students.view') && { to: '/students', label: 'Find a student', icon: GraduationCap },
    can('users.manage') && { to: '/users', label: 'Manage users', icon: ShieldCheck },
    can('audit.view') && { to: '/audit', label: 'Open audit log', icon: ScrollText },
    can('structure.view') && { to: '/structure', label: 'Academic structure', icon: Building2 },
    { to: '/change-password', label: 'Change password', icon: KeyRound },
  ].filter(Boolean) as { to: string; label: string; icon: LucideIcon }[]

  const firstName = user.fullName.split(' ')[0]
  const queue = data ? workQueue(data) : null

  return (
    <section className="dashboard">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">{ROLE_LABELS[user.role].toUpperCase()}</span>
          <h1 className="greeting">
            {greeting()}, {firstName}.
          </h1>
          <p className="muted">{ROLE_SUBTITLES[user.role]}</p>
        </div>
        <div className="viewing-as">
          <span className="avatar square">{initials(user.fullName)}</span>
          <span>
            <small>SIGNED IN AS</small>
            <strong>{ROLE_LABELS[user.role]}</strong>
          </span>
          <Users size={20} strokeWidth={1.75} className="muted" />
        </div>
      </div>

      <ErrorNotice error={error} />

      <div className="stat-cards">
        {(data ? statCards(data) : []).map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className={`stat-card ${tone}`}>
            <span className="stat-icon">
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <span className="stat-body">
              <small>{label.toUpperCase()}</small>
              <strong>{value}</strong>
              <span className="stat-hint">{hint}</span>
            </span>
          </div>
        ))}
        {!data && !error && <p className="muted">Loading figures...</p>}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">WORK QUEUE</span>
              <h2>{queue?.title ?? 'Priorities requiring attention'}</h2>
            </div>
            {queue?.viewAll && (
              <Link to={queue.viewAll} className="view-all">
                View all <ArrowRight size={16} />
              </Link>
            )}
          </div>
          <ol className="queue">
            {queue?.items.map((item, index) => (
              <li key={item.key}>
                <span className="queue-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="queue-body">
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </span>
                {item.badge && <span className={`badge ${item.badge.tone}`}>{item.badge.label}</span>}
                {item.to ? (
                  <Link to={item.to} className="round-link" aria-label="Open">
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <span className="round-link placeholder" aria-hidden="true" />
                )}
              </li>
            ))}
            {queue && queue.items.length === 0 && <li className="queue-empty muted">{queue.empty}</li>}
          </ol>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">SHORTCUTS</span>
              <h2>Quick actions</h2>
            </div>
          </div>
          <div className="quick-actions">
            {actions.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="quick-action">
                <span className="qa-icon">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <strong>{label}</strong>
                <ArrowRight size={16} className="muted" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
