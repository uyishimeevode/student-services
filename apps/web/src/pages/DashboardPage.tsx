import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { ROLE_LABELS, type DashboardData, type StudentStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice } from '../components/Field'

const STATUSES: StudentStatus[] = ['ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED']

/** Short descriptions of what each role sees, for roles whose modules are still to come. */
const SCOPE_NOTE: Partial<Record<DashboardData['role'], string>> = {
  HEAD_OF_DEPARTMENT: 'Figures cover students in your department.',
  DEAN: 'Figures cover students in your faculty.',
  LECTURER: 'Class lists, attendance and grades will appear here when the teaching module is released.',
  FINANCE_OFFICER: 'Invoices and payments will appear here when the fees module is released.',
  STUDENT_SERVICES_OFFICER: 'Open requests and appointments will appear here when the requests module is released.',
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

  const shortcuts = [
    user.role === 'STUDENT' && { to: '/me', title: 'My record', text: 'Your registration and programme details.' },
    can('students.register') && { to: '/students/new', title: 'Register a student', text: 'Create the record and login.' },
    can('students.view') && { to: '/students', title: 'Students', text: 'Search and open student records.' },
    can('structure.view') && { to: '/structure', title: 'Academic structure', text: 'Faculties, departments and programmes.' },
    can('users.manage') && { to: '/users', title: 'Users', text: 'Staff accounts and roles.' },
    can('audit.view') && { to: '/audit', title: 'Audit log', text: 'Who changed what, and when.' },
  ].filter(Boolean) as { to: string; title: string; text: string }[]

  const note = SCOPE_NOTE[user.role]

  return (
    <section>
      <h1>Welcome, {user.fullName}</h1>
      <p className="muted">Signed in as {ROLE_LABELS[user.role]}.</p>
      {note && <p className="notice">{note}</p>}
      <ErrorNotice error={error} />

      {data?.myRecord && (
        <div className="stats">
          <Stat label="Registration number" value={data.myRecord.registrationNumber ?? '-'} />
          <Stat label="Programme" value={data.myRecord.program.code} hint={data.myRecord.program.name} />
          <Stat label="Year of study" value={`${data.myRecord.yearOfStudy} of ${data.myRecord.program.durationYears}`} />
          <Stat label="Status" value={data.myRecord.status} />
        </div>
      )}

      {data?.students && (
        <>
          <div className="stats">
            <Stat label="Students" value={data.students.total} />
            <Stat label={`${data.students.currentIntakeYear} intake`} value={data.students.currentIntake} />
            {STATUSES.map((s) => (
              <Stat key={s} label={s.charAt(0) + s.slice(1).toLowerCase()} value={data.students!.byStatus[s]} />
            ))}
          </div>
          <div className="columns">
            <div>
              <h2>Students by programme</h2>
              <table>
                <tbody>
                  {data.students.byProgram.map((p) => (
                    <tr key={p.programId}>
                      <td>
                        <strong>{p.code}</strong> <span className="muted">{p.name}</span>
                      </td>
                      <td className="num">{p.count}</td>
                    </tr>
                  ))}
                  {data.students.byProgram.length === 0 && (
                    <tr>
                      <td className="muted">No students yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data.students.recent && (
              <div>
                <h2>Latest registrations</h2>
                <table>
                  <tbody>
                    {data.students.recent.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <Link to={`/students/${s.id}`}>{s.registrationNumber}</Link>
                        </td>
                        <td>
                          {s.firstName} {s.lastName}
                        </td>
                        <td className="muted">{s.program.code}</td>
                      </tr>
                    ))}
                    {data.students.recent.length === 0 && (
                      <tr>
                        <td className="muted">No registrations yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {data?.users && (
        <>
          <div className="stats">
            <Stat label="Active accounts" value={data.users.active} />
            <Stat label="Inactive accounts" value={data.users.inactive} />
            <Stat label="Awaiting password change" value={data.users.pendingPasswordChange} />
          </div>
          <div className="columns">
            <div>
              <h2>Active accounts by role</h2>
              <table>
                <tbody>
                  {Object.entries(data.users.activeByRole).map(([role, count]) => (
                    <tr key={role}>
                      <td>{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</td>
                      <td className="num">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.recentActivity && (
              <div>
                <h2>Recent activity</h2>
                <table>
                  <tbody>
                    {data.recentActivity.map((a) => (
                      <tr key={a.id}>
                        <td>{a.actor?.fullName ?? 'System'}</td>
                        <td>{a.action}</td>
                        <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {data?.structure && (
        <div className="stats">
          <Stat label="Faculties" value={data.structure.faculties} />
          <Stat label="Departments" value={data.structure.departments} />
          <Stat label="Programmes" value={data.structure.programs} />
        </div>
      )}

      <h2 className="section-title">Shortcuts</h2>
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

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card stat">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  )
}
