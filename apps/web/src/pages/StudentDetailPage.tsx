import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Student, StudentStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice, Field } from '../components/Field'
import { StudentDetails } from '../components/StudentDetails'

const STATUSES: StudentStatus[] = ['ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED']

export function StudentDetailPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StudentStatus>('ACTIVE')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Student>(`/students/${id}`)
      .then((s) => {
        setStudent(s)
        setStatus(s.status)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [id])

  async function changeStatus(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const updated = await api<Student>(`/students/${id}/status`, { method: 'PATCH', body: { status, reason } })
      setStudent(updated)
      setReason('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!student) return <ErrorNotice error={error} />

  return (
    <section className="narrow">
      <h1>
        {student.firstName} {student.lastName}
      </h1>
      <ErrorNotice error={error} />
      <StudentDetails student={student} />
      {can('students.status') && (
        <form className="card form" onSubmit={changeStatus}>
          <h2>Change status</h2>
          <div className="row">
            <Field label="New status">
              <select value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reason">
              <input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} />
            </Field>
          </div>
          <button type="submit" disabled={busy || status === student.status}>
            Save status
          </button>
        </form>
      )}
    </section>
  )
}
