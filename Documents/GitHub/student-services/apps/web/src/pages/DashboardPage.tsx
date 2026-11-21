import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpen as BookIcon,
  ClipboardCheck,
  FileUser,
  Inbox,
  Presentation,
  Wallet,
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
  UserCheck as UserCheckIcon,
  UserX,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, initials, money } from '../api/client'
import { ROLE_LABELS, type DashboardData, type Permission, type Role, type StudentStatus } from '../api/types'
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
  STUDENT: 'Register courses, follow your grades, pay fees and send requests.',
  LECTURER: 'Manage your class lists, attendance, grades and course materials.',
  HEAD_OF_DEPARTMENT: 'Assign lecturers, approve grades and follow students in your department.',
  DEAN: 'Follow departments, results and students across your faculty.',
  ADMISSIONS_OFFICER: 'Review applications, verify documents, issue offers and enrol new students.',
  REGISTRAR: 'Manage terms, registration, official student records and transcripts.',
  FINANCE_OFFICER: 'Bill students, verify payments, apply waivers and follow collections.',
  STUDENT_SERVICES_OFFICER: 'Triage student requests, issue letters and manage appointments.',
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
    const p = data.studentPortal
    return [
      { label: 'Registration', value: r.registrationNumber ?? '-', hint: `${r.program.code} · year ${r.yearOfStudy} of ${r.program.durationYears}`, icon: IdCard, tone: 'green' },
      { label: 'Courses this term', value: p?.registeredCourses ?? 0, hint: `${p?.registeredCredits ?? 0} credits`, icon: BookOpen, tone: 'amber' },
      { label: 'Fee balance', value: money(p?.feeBalance ?? 0), hint: p?.feeBalance ? 'To pay' : 'Nothing owed', icon: Wallet, tone: 'blue' },
      { label: 'Status', value: titleCase(r.status), hint: `${p?.openRequests ?? 0} open requests`, icon: CircleCheck, tone: 'purple' },
    ]
  }
  if (data.approvals) {
    return [
      { label: 'Students', value: data.students?.total ?? 0, hint: 'In your department', icon: GraduationCap, tone: 'green' },
      { label: 'Awaiting approval', value: data.approvals.pendingCount, hint: 'Submitted grade sheets', icon: ClipboardCheck, tone: 'amber' },
      { label: 'Unassigned classes', value: data.approvals.unassigned, hint: 'Need a lecturer', icon: Presentation, tone: 'blue' },
      { label: 'At-risk students', value: data.students?.atRisk ?? 0, hint: 'Low scores or attendance', icon: TriangleAlert, tone: 'purple' },
    ]
  }
  if (data.teaching) {
    const t = data.teaching
    return [
      { label: 'Classes', value: t.classCount, hint: data.term?.name ?? 'This term', icon: Presentation, tone: 'green' },
      { label: 'Students', value: t.studentCount, hint: 'Across your classes', icon: Users, tone: 'amber' },
      { label: 'Grading', value: t.gradesOutstanding, hint: t.returned ? `${t.returned} returned to you` : 'Classes not yet submitted', icon: ClipboardCheck, tone: 'blue' },
      { label: 'Avg attendance', value: t.averageAttendance === null ? '-' : `${t.averageAttendance}%`, hint: `${t.sessionCount} sessions recorded`, icon: CalendarDays, tone: 'purple' },
    ]
  }
  if (data.finance) {
    const f = data.finance
    return [
      { label: 'Billed', value: money(f.billed), hint: `${f.invoices} invoices`, icon: Wallet, tone: 'green' },
      { label: 'Collected', value: money(f.collected), hint: `${f.collectionRate}% of what is due`, icon: CircleCheck, tone: 'amber' },
      { label: 'To verify', value: f.pendingCount, hint: money(f.pending), icon: ClipboardCheck, tone: 'blue' },
      { label: 'Outstanding', value: money(f.outstanding), hint: 'Still to collect', icon: TriangleAlert, tone: 'purple' },
    ]
  }
  if (data.requests && data.role === 'STUDENT_SERVICES_OFFICER') {
    const r = data.requests
    return [
      { label: 'Open', value: r.byStatus.OPEN, hint: 'New requests', icon: Inbox, tone: 'green' },
      { label: 'Unassigned', value: r.unassigned, hint: 'Nobody has taken them', icon: TriangleAlert, tone: 'amber' },
      { label: 'Mine', value: r.mine, hint: 'In progress with you', icon: UserCheckIcon, tone: 'blue' },
      { label: 'Resolved', value: r.byStatus.RESOLVED, hint: `${r.upcoming.length} upcoming appointments`, icon: CircleCheck, tone: 'purple' },
    ]
  }
  if (data.admissions) {
    const a = data.admissions.byStatus
    return [
      { label: 'New applications', value: a.SUBMITTED, hint: 'Not reviewed yet', icon: FileUser, tone: 'green' },
      { label: 'Under review', value: a.UNDER_REVIEW, hint: 'Documents being checked', icon: ClipboardCheck, tone: 'amber' },
      { label: 'Offers', value: a.OFFERED, hint: 'Waiting to enrol', icon: BookIcon, tone: 'blue' },
      { label: 'Enrolled', value: a.ENROLLED, hint: `${a.REJECTED} rejected`, icon: GraduationCap, tone: 'purple' },
    ]
  }
  if (data.students && data.role === 'DEAN') {
    const s = data.students
    return [
      { label: 'Students', value: s.total, hint: `Across ${s.byProgram.length} programmes`, icon: Users, tone: 'green' },
      { label: 'Active', value: s.byStatus.ACTIVE, hint: `${s.byStatus.GRADUATED} graduated`, icon: CircleCheck, tone: 'amber' },
      { label: `${s.currentIntakeYear} intake`, value: s.currentIntake, hint: 'New this year', icon: UserPlus, tone: 'blue' },
      { label: 'At-risk', value: s.atRisk, hint: 'Across departments', icon: TriangleAlert, tone: 'purple' },
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
  if (data.approvals) {
    return {
      title: 'Grades awaiting your approval',
      viewAll: '/approvals',
      empty: 'No grade sheets waiting.',
      items: data.approvals.pending.map((o) => ({
        key: o.id,
        title: `${o.course.code} · ${o.course.title}`,
        meta: `${o.lecturer?.fullName ?? 'No lecturer'} · ${o._count.enrollments} students`,
        badge: { label: 'Submitted', tone: 'suspended' },
        to: `/classes/${o.id}`,
      })),
    }
  }
  if (data.teaching) {
    return {
      title: 'Your classes this term',
      viewAll: '/classes',
      empty: 'No classes assigned this term.',
      items: data.teaching.classes.map((c) => ({
        key: c.id,
        title: `${c.course.code} · ${c.course.title}`,
        meta: `${c._count.enrollments} students · ${c._count.sessions} sessions`,
        badge: { label: titleCase(c.gradeStatus), tone: c.gradeStatus === 'APPROVED' ? 'active' : c.gradeStatus === 'RETURNED' ? 'withdrawn' : 'suspended' },
        to: `/classes/${c.id}`,
      })),
    }
  }
  if (data.finance) {
    return {
      title: 'Payments to verify',
      viewAll: '/finance',
      empty: 'No payments waiting.',
      items: data.finance.pendingPayments.map((p) => ({
        key: p.id,
        title: `${p.invoice.student.firstName} ${p.invoice.student.lastName} · ${money(p.amount)}`,
        meta: `${p.reference} · ${titleCase(p.method.replace('_', ' '))} · ${shortDate(p.createdAt)}`,
        badge: { label: 'Pending', tone: 'suspended' },
        to: '/finance',
      })),
    }
  }
  if (data.requests && data.role === 'STUDENT_SERVICES_OFFICER') {
    return {
      title: 'Requests in the queue',
      viewAll: '/requests',
      empty: 'The queue is empty.',
      items: data.requests.queue.map((r) => ({
        key: r.id,
        title: r.subject,
        meta: `${r.student.firstName} ${r.student.lastName} · ${titleCase(r.type.replace('_', ' '))} · ${shortDate(r.createdAt)}`,
        badge: { label: titleCase(r.status.replace('_', ' ')), tone: r.status === 'OPEN' ? 'suspended' : 'graduated' },
        to: '/requests',
      })),
    }
  }
  if (data.admissions) {
    return {
      title: 'Applications to review',
      viewAll: '/applications',
      empty: 'No applications waiting.',
      items: data.admissions.latest.map((a) => ({
        key: a.id,
        title: `${a.firstName} ${a.lastName}`,
        meta: `${a.program.code} · applied ${shortDate(a.createdAt)}`,
        badge: { label: titleCase(a.status.replace('_', ' ')), tone: a.status === 'SUBMITTED' ? 'suspended' : 'graduated' },
        to: '/applications',
      })),
    }
  }
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
        {
          key: 'courses',
          title: 'Course registration',
          meta: data.term ? `${data.term.name} · ${data.studentPortal?.registeredCourses ?? 0} courses registered` : 'No term open',
          badge: data.term?.registrationOpen ? { label: 'Open', tone: 'active' } : { label: 'Closed', tone: 'neutral' },
          to: '/my/courses',
        },
        {
          key: 'fees',
          title: 'School fees',
          meta: data.studentPortal?.feeBalance ? `${money(data.studentPortal.feeBalance)} to pay` : 'Nothing owed',
          badge: data.studentPortal?.feeBalance ? { label: 'Balance due', tone: 'suspended' } : { label: 'Paid', tone: 'active' },
          to: '/my/fees',
        },
        {
          key: 'grades',
          title: 'Results',
          meta: 'Approved grades and GPA',
          to: '/my/grades',
        },
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
    can('courses.register') && { to: '/my/courses', label: 'Register courses', icon: BookOpen },
    can('fees.pay') && { to: '/my/fees', label: 'Pay fees', icon: Wallet },
    can('requests.submit') && { to: '/my/requests', label: 'Submit a request', icon: Inbox },
    can('teaching') && { to: '/classes', label: 'My classes', icon: Presentation },
    can('grades.approve') && { to: '/approvals', label: 'Approve grades', icon: ClipboardCheck },
    can('courses.manage') && { to: '/courses', label: 'Assign lecturers', icon: BookOpen },
    can('applications.manage') && { to: '/applications', label: 'Review applications', icon: FileUser },
    can('finance.manage') && { to: '/finance', label: 'Verify payments', icon: Wallet },
    can('requests.manage') && { to: '/requests', label: 'Service requests', icon: Inbox },
    can('terms.manage') && { to: '/terms', label: 'Academic terms', icon: CalendarDays },
    can('reports.view') && { to: '/reports', label: 'Reports', icon: Layers },
    user.role === 'STUDENT' && { to: '/me', label: 'View my record', icon: IdCard },
    can('students.register') && { to: '/students/new', label: 'Register student', icon: UserPlus },
    can('students.view') && { to: '/students', label: 'Find a student', icon: GraduationCap },
    can('users.manage') && { to: '/users', label: 'Manage users', icon: ShieldCheck },
    can('audit.view') && { to: '/audit', label: 'Open audit log', icon: ScrollText },
    can('structure.view') && { to: '/structure', label: 'Academic structure', icon: Building2 },
    { to: '/change-password', label: 'Change password', icon: KeyRound },
  ]
    .filter(Boolean)
    .slice(0, 6) as { to: string; label: string; icon: LucideIcon }[]

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

      {user.role !== 'STUDENT' && (
        <div className="dashboard-grid bottom">
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">AUDITABLE ACTIVITY</span>
                <h2>Your recent updates</h2>
              </div>
              {can('audit.view') && (
                <Link to="/audit" className="view-all">
                  Activity log <ArrowRight size={16} />
                </Link>
              )}
            </div>
            <ol className="queue">
              {(data?.myActivity ?? []).map((a) => (
                <li key={a.id}>
                  <span className="queue-body">
                    <strong>{titleCase(a.action.replace(/[._]/g, ' '))}</strong>
                    <small>{shortDate(a.createdAt)}</small>
                  </span>
                  <span className="badge graduated">{titleCase(a.entity)}</span>
                </li>
              ))}
              {data && (data.myActivity ?? []).length === 0 && <li className="queue-empty muted">You have not changed anything yet.</li>}
            </ol>
          </div>
          <div className="role-card">
            <span className="role-card-eyebrow">
              <CircleCheck size={16} /> ROLE ACCESS
            </span>
            <h2>{ROLE_LABELS[user.role]}</h2>
            <p>{ROLE_GROUP_LABEL[user.role]}</p>
            <ul>
              {user.permissions.map((p) => (
                <li key={p}>{PERMISSION_TEXT[p] ?? p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

const ROLE_GROUP_LABEL: Record<Role, string> = {
  STUDENT: 'Student Access',
  LECTURER: 'Academic Delivery',
  HEAD_OF_DEPARTMENT: 'Academic Delivery',
  DEAN: 'Academic Delivery',
  ADMISSIONS_OFFICER: 'Student Operations',
  REGISTRAR: 'Student Operations',
  FINANCE_OFFICER: 'Student Operations',
  STUDENT_SERVICES_OFFICER: 'Student Operations',
  SYSTEM_ADMINISTRATOR: 'System Control',
}

const PERMISSION_TEXT: Partial<Record<Permission, string>> = {
  'users.manage': 'Manage users and roles',
  'audit.view': 'View audit logs',
  'structure.manage': 'Manage academic structure',
  'structure.view': 'View academic structure',
  'students.register': 'Register students',
  'students.view': 'View student records',
  'students.update': 'Edit student records',
  'students.status': 'Change student status',
  'terms.manage': 'Open and close registration',
  'courses.manage': 'Manage courses',
  'offerings.manage': 'Assign lecturers',
  teaching: 'Attendance, grades and materials',
  'grades.approve': 'Approve grades',
  'transcripts.view': 'View transcripts',
  'reports.view': 'View reports',
  'finance.manage': 'Invoices, payments and waivers',
  'requests.manage': 'Handle service requests',
  'applications.manage': 'Review applications and offers',
}
