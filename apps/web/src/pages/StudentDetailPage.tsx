import { ArrowLeft } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Student, StudentStatus, Transcript } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice, Field, Panel } from '../components/Field'
import { StudentDetails, StudentProfileHeader } from '../components/StudentDetails'
import { TranscriptView } from '../components/TranscriptView'

const STATUSES: { value: StudentStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'GRADUATED', label: 'Graduated' },
]

export function StudentDetailPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StudentStatus>('ACTIVE')
  const [reason, setReason] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [transcript, setTranscript] = useState<Transcript | null>(null)

  useEffect(() => {
    api<Student>(`/students/${id}`)
      .then((s) => {
        setStudent(s)
        setStatus(s.status)
      })
      .catch((err) => setError(errorMessage(err)))
    if (can('transcripts.view')) {
      api<Transcript>(`/students/${id}/transcript`)
        .then(setTranscript)
        .catch(() => setTranscript(null))
    }
  }, [id, can])

  async function changeStatus(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await api<Student>(`/students/${id}/status`, { method: 'PATCH', body: { status, reason } })
      setStudent(updated)
      setReason('')
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      {can('students.view') && (
        <Link to="/students" className="back-link">
          <ArrowLeft size={16} /> All students
        </Link>
      )}
      <ErrorNotice error={error} />
      {student && (
        <>
          <StudentProfileHeader student={student} />
          <div className={can('students.status') ? 'record-layout' : ''}>
            <StudentDetails student={student} />
            {can('students.status') && (
              <Panel eyebrow="Registry" title="Change status" className="side-panel">
                <form className="form" onSubmit={changeStatus}>
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
                  <Field label="Reason" hint="Kept in the audit log.">
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} rows={3} />
                  </Field>
                  {saved && <p className="notice success">Status updated.</p>}
                  <button type="submit" disabled={busy || status === student.status}>
                    {busy ? 'Saving...' : 'Save status'}
                  </button>
                </form>
              </Panel>
            )}
          </div>
          {transcript && (
            <>
              <h2 className="section-title">
                Transcript · cumulative GPA {transcript.cumulativeGpa?.toFixed(2) ?? '-'} · {transcript.creditsEarned} credits earned
              </h2>
              {transcript.terms.length ? <TranscriptView transcript={transcript} /> : <p className="muted">No approved results yet.</p>}
            </>
          )}
        </>
      )}
    </section>
  )
}
