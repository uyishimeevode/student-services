import { ArrowRight, Search, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorMessage, initials, query } from '../api/client'
import type { Page, Program, Student, StudentStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorNotice, PageHeader, Panel, StatusBadge } from '../components/Field'

const STATUSES: { value: '' | StudentStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'GRADUATED', label: 'Graduated' },
]

export function StudentsPage() {
  const { user, can } = useAuth()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const [status, setStatus] = useState<'' | StudentStatus>('')
  const [programId, setProgramId] = useState('')
  const [programs, setPrograms] = useState<Program[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      setError(null)
      try {
        const page = await api<Page<Student>>(`/students${query({ search, status, programId, cursor, limit: 25 })}`)
        setStudents((current) => (cursor ? [...current, ...page.items] : page.items))
        setNextCursor(page.nextCursor)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [search, status, programId],
  )

  // The top bar search opens this page with ?search=; follow it when it changes.
  useEffect(() => {
    setSearch(params.get('search') ?? '')
  }, [params])

  useEffect(() => {
    api<Program[]>('/programs').then(setPrograms).catch(() => setPrograms([]))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300)
    return () => clearTimeout(timer)
  }, [load])

  const scope =
    user?.role === 'HEAD_OF_DEPARTMENT'
      ? 'Students in your department.'
      : user?.role === 'DEAN'
        ? 'Students in your faculty.'
        : 'Search and open official student records.'

  return (
    <section>
      <PageHeader
        eyebrow="Records"
        title="Students"
        subtitle={scope}
        actions={
          can('students.register') && (
            <Link to="/students/new" className="button">
              <UserPlus size={18} /> Register student
            </Link>
          )
        }
      />

      <Panel>
        <div className="toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              placeholder="Search by name, email or registration number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)}>
            <option value="">All programmes</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="chips">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`chip ${status === s.value ? 'selected' : ''}`}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <ErrorNotice error={error} />

        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Reg. number</th>
              <th>Programme</th>
              <th>Year</th>
              <th>Status</th>
              <th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/students/${s.id}`} className="person">
                    <span className="avatar">{initials(`${s.firstName} ${s.lastName}`)}</span>
                    <span>
                      <strong>
                        {s.firstName} {s.lastName}
                      </strong>
                      <small>{s.user.email}</small>
                    </span>
                  </Link>
                </td>
                <td className="mono">{s.registrationNumber}</td>
                <td>
                  <strong className="code">{s.program.code}</strong>
                </td>
                <td>{s.yearOfStudy}</td>
                <td>
                  <StatusBadge status={s.status} />
                </td>
                <td className="row-action">
                  <Link to={`/students/${s.id}`} className="round-link" aria-label="Open record">
                    <ArrowRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && students.length === 0 && (
          <EmptyState title="No students found" text="Try another search or clear the filters." />
        )}
        {nextCursor && (
          <div className="load-more">
            <button type="button" className="secondary" disabled={loading} onClick={() => void load(nextCursor)}>
              Load more
            </button>
          </div>
        )}
      </Panel>
    </section>
  )
}
