import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, query, errorMessage } from '../api/client'
import { ROLE_LABELS, type Department, type Faculty, type Page, type Role, type UserRecord } from '../api/types'
import { ErrorNotice, Field } from '../components/Field'

const STAFF_ROLES = (Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== 'STUDENT')

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roleFilter, setRoleFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', fullName: '', role: 'REGISTRAR' as Role, departmentId: '', facultyId: '' })

  const load = useCallback(async () => {
    try {
      const page = await api<Page<UserRecord>>(`/users${query({ role: roleFilter, limit: 100 })}`)
      setUsers(page.items)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [roleFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    api<Faculty[]>('/faculties').then(setFaculties).catch(() => undefined)
    api<Department[]>('/departments').then(setDepartments).catch(() => undefined)
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    try {
      const body = {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        departmentId: form.role === 'HEAD_OF_DEPARTMENT' ? form.departmentId : undefined,
        facultyId: form.role === 'DEAN' ? form.facultyId : undefined,
      }
      const result = await api<{ user: UserRecord; temporaryPassword: string }>('/users', { method: 'POST', body })
      setNotice(`Created ${result.user.email}. Temporary password: ${result.temporaryPassword} (shown once).`)
      setForm({ ...form, email: '', fullName: '' })
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
      setNotice(`New temporary password for ${user.email}: ${result.temporaryPassword} (shown once).`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <h1>Users</h1>
      <ErrorNotice error={error} />
      {notice && <p className="notice success">{notice}</p>}
      <form className="card form" onSubmit={create}>
        <h2>Create staff account</h2>
        <div className="row">
          <Field label="Full name">
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          {form.role === 'HEAD_OF_DEPARTMENT' && (
            <Field label="Department">
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                <option value="">Select</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.role === 'DEAN' && (
            <Field label="Faculty">
              <select value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} required>
                <option value="">Select</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <button type="submit">Create account</button>
      </form>

      <div className="filters">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.fullName}</td>
              <td>{u.email}</td>
              <td>{ROLE_LABELS[u.role]}</td>
              <td>
                <span className={`badge ${u.isActive ? 'active' : 'suspended'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
              </td>
              <td className="actions">
                <button type="button" className="secondary" onClick={() => void toggleActive(u)}>
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" className="secondary" onClick={() => void resetPassword(u)}>
                  Reset password
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
