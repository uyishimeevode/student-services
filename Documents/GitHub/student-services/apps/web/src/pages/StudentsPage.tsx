import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, query, errorMessage } from '../api/client'
import type { Page, Program, Student, StudentStatus } from '../api/types'
import { ErrorNotice } from '../components/Field'

const STATUSES: StudentStatus[] = ['ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED']

export function StudentsPage() {
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const [status, setStatus] = useState('')
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

  return (
    <section>
      <h1>Students</h1>
      <div className="filters">
        <input placeholder="Search name, email or registration number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={programId} onChange={(e) => setProgramId(e.target.value)}>
          <option value="">All programmes</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <ErrorNotice error={error} />
      <table>
        <thead>
          <tr>
            <th>Reg. number</th>
            <th>Name</th>
            <th>Programme</th>
            <th>Year</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>
                <Link to={`/students/${s.id}`}>{s.registrationNumber}</Link>
              </td>
              <td>
                {s.firstName} {s.lastName}
              </td>
              <td>{s.program.code}</td>
              <td>{s.yearOfStudy}</td>
              <td>
                <span className={`badge ${s.status.toLowerCase()}`}>{s.status}</span>
              </td>
            </tr>
          ))}
          {!loading && students.length === 0 && (
            <tr>
              <td colSpan={5} className="muted center">
                No students found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {nextCursor && (
        <button type="button" className="secondary" disabled={loading} onClick={() => void load(nextCursor)}>
          Load more
        </button>
      )}
    </section>
  )
}
