import { Link } from 'react-router-dom'
import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function DashboardPage() {
  const { user, can } = useAuth()
  if (!user) return null

  const shortcuts = [
    user.role === 'STUDENT' && { to: '/me', title: 'My record', text: 'Your registration and programme details.' },
    can('students.register') && { to: '/students/new', title: 'Register a student', text: 'Create the record and login.' },
    can('students.view') && { to: '/students', title: 'Students', text: 'Search and open student records.' },
    can('structure.view') && { to: '/structure', title: 'Academic structure', text: 'Faculties, departments and programmes.' },
    can('users.manage') && { to: '/users', title: 'Users', text: 'Staff accounts and roles.' },
    can('audit.view') && { to: '/audit', title: 'Audit log', text: 'Who changed what, and when.' },
  ].filter(Boolean) as { to: string; title: string; text: string }[]

  return (
    <section>
      <h1>Welcome, {user.fullName}</h1>
      <p className="muted">Signed in as {ROLE_LABELS[user.role]}.</p>
      <div className="grid">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to} className="card tile">
            <strong>{s.title}</strong>
            <span className="muted">{s.text}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
