import { NavLink, Outlet } from 'react-router-dom'
import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { user, can, signOut } = useAuth()
  if (!user) return null

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Student Services</strong>
          <span>Team Karisimbi</span>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          {user.role === 'STUDENT' && <NavLink to="/me">My record</NavLink>}
          {can('students.view') && <NavLink to="/students" end>Students</NavLink>}
          {can('students.register') && <NavLink to="/students/new">Register student</NavLink>}
          {can('structure.view') && <NavLink to="/structure">Academic structure</NavLink>}
          {can('users.manage') && <NavLink to="/users">Users</NavLink>}
          {can('audit.view') && <NavLink to="/audit">Audit log</NavLink>}
        </nav>
        <div className="account">
          <span className="name">{user.fullName}</span>
          <span className="muted">{ROLE_LABELS[user.role]}</span>
          <NavLink to="/change-password">Change password</NavLink>
          <button type="button" className="link" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
