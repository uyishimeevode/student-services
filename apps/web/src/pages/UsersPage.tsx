import { KeyRound, Plus, Power, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage, initials, query } from '../api/client'
import { ROLE_LABELS, type Department, type Faculty, type Page, type Role, type UserRecord } from '../api/types'
import { EmptyState, ErrorNotice, Field, PageHeader, Panel, SecretNotice } from '../components/Field'

const STAFF_ROLES = (Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== 'STUDENT')

const ROLE_GROUP: Record<Role, string> = {
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

const emptyForm = { email: '', fullName: '', role: 'REGISTRAR' as Role, departmentId: '', facultyId: '' }

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<{ email: string; password: string; created: boolean } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    try {
      const page = await api<Page<UserRecord>>(`/users${query({ role: roleFilter, search, limit: 100 })}`)
      setUsers(page.items)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [roleFilter, search])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    api<Faculty[]>('/faculties')
      .then(setFaculties)
      .catch(() => undefined)
    api<Department[]>('/departments')
      .then(setDepartments)
      .catch(() => undefined)
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const body = {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        departmentId: form.role === 'HEAD_OF_DEPARTMENT' ? form.departmentId : undefined,
        facultyId: form.role === 'DEAN' ? form.facultyId : undefined,
      }
      const result = await api<{ user: UserRecord; temporaryPassword: string }>('/users', { method: 'POST', body })
      setSecret({ email: result.user.email, password: result.temporaryPassword, created: true })
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function toggleActive(user: UserRecord) {
    setError(null)
    try {
      await api(`/users/${user.id}`, { method: 'PATCH', body: { isActive: !user.isActive } })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function resetPassword(user: UserRecord) {
    setError(null)
    try {
      const result = await api<{ temporaryPassword: string }>(`/users/${user.id}/reset-password`, { method: 'POST' })
      setSecret({ email: user.email, password: result.temporaryPassword, created: false })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="System control"
        title="User roles"
        subtitle="Staff accounts, their roles and access scope. Student accounts are created by registration."
        actions={
          !showForm && (
            <button type="button" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Create account
            </button>
          )
        }
      />

      <ErrorNotice error={error} />
      {secret && (
        <SecretNotice secret={secret.password}>
          <p>
            {secret.created ? 'Account created for' : 'Password reset for'} <strong>{secret.email}</strong>. Temporary
            password:
          </p>
        </SecretNotice>
      )}

      {showForm && (
        <Panel
          eyebrow="New account"
          title="Create staff account"
          actions={
            <button type="button" className="icon-only" aria-label="Close" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          }
        >
          <form className="form" onSubmit={create}>
            <div className="row">
              <Field label="Full name">
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
            </div>
            <div className="row">
              <Field label="Role" hint={ROLE_GROUP[form.role]}>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>
              {form.role === 'HEAD_OF_DEPARTMENT' && (
                <Field label="Department" hint="Limits which students they can see.">
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    required
                  >
                    <option value="">Select</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} · {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {form.role === 'DEAN' && (
                <Field label="Faculty" hint="Limits which students they can see.">
                  <select
                    value={form.facultyId}
                    onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                    required
                  >
                    <option value="">Select</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} · {f.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit">Create account</button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <div className="toolbar">
          <label className="search-field">
            <input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="person">
                    <span className="avatar">{initials(u.fullName)}</span>
                    <span>
                      <strong>{u.fullName}</strong>
                      <small>{u.email}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="role-cell">
                    <strong>{ROLE_LABELS[u.role]}</strong>
                    <small>{ROLE_GROUP[u.role]}</small>
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.isActive ? 'active' : 'withdrawn'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {u.mustChangePassword && u.isActive && (
                    <span className="badge suspended spaced">Password pending</span>
                  )}
                </td>
                <td className="actions">
                  <span className="action-group">
                    <button type="button" className="secondary small-button" onClick={() => void resetPassword(u)}>
                      <KeyRound size={15} /> Reset password
                    </button>
                    <button type="button" className="secondary small-button" onClick={() => void toggleActive(u)}>
                      <Power size={15} /> {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <EmptyState title="No accounts match" />}
      </Panel>
    </section>
  )
}
