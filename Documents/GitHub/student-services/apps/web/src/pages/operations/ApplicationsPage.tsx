import { BadgeCheck, GraduationCap, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorMessage, formatDate, initials, query } from '../../api/client'
import type { Application, ApplicationStatus } from '../../api/types'
import { EmptyState, ErrorNotice, Field, PageHeader, Panel, SecretNotice, StateBadge } from '../../components/Field'

const FILTERS: { value: '' | ApplicationStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'SUBMITTED', label: 'New' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'OFFERED', label: 'Offered' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ENROLLED', label: 'Enrolled' },
]

export function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [params] = useSearchParams()
  const [status, setStatus] = useState<'' | ApplicationStatus>((params.get('status') as ApplicationStatus | null) ?? '')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState<{ name: string; reg: string; email: string; password: string; studentId: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setApplications(await api<Application[]>(`/applications${query({ status, search })}`))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [status, search])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  const selected = applications.find((a) => a.id === selectedId) ?? null

  return (
    <section>
      <PageHeader
        eyebrow="Admissions"
        title="Applications"
        subtitle={
          <>
            Review applications, verify documents, issue offers and enrol. Applicants apply at <Link to="/apply">/apply</Link>.
          </>
        }
      />
      <ErrorNotice error={error} />
      {enrolled && (
        <SecretNotice secret={enrolled.password}>
          <p>
            <strong>{enrolled.name}</strong> is enrolled as <strong>{enrolled.reg}</strong>. <Link to={`/students/${enrolled.studentId}`}>Open record</Link>
          </p>
          <p>Temporary password for {enrolled.email}:</p>
        </SecretNotice>
      )}
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input placeholder="Search applicants" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className={`chip ${status === f.value ? 'selected' : ''}`} onClick={() => setStatus(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="split">
        <Panel className="list-panel">
          <ul className="request-list">
            {applications.map((a) => (
              <li key={a.id}>
                <button type="button" className={`request-item ${selectedId === a.id ? 'selected' : ''}`} onClick={() => setSelectedId(a.id)}>
                  <span className="avatar">{initials(`${a.firstName} ${a.lastName}`)}</span>
                  <span className="item-body">
                    <strong>
                      {a.firstName} {a.lastName}
                    </strong>
                    <small>
                      {a.program.code} · intake {a.intakeYear} · {formatDate(a.createdAt)}
                    </small>
                  </span>
                  <StateBadge status={a.status} />
                </button>
              </li>
            ))}
          </ul>
          {applications.length === 0 && <EmptyState title="No applications" />}
        </Panel>
        {selected ? (
          <ApplicationDetail
            key={selected.id + selected.status + String(selected.documentsVerified)}
            application={selected}
            onSaved={load}
            onEnrolled={(e) => setEnrolled(e)}
            setError={setError}
          />
        ) : (
          <Panel>
            <EmptyState title="Select an application" />
          </Panel>
        )}
      </div>
    </section>
  )
}

function ApplicationDetail({
  application: a,
  onSaved,
  onEnrolled,
  setError,
}: {
  application: Application
  onSaved: () => Promise<void>
  onEnrolled: (e: { name: string; reg: string; email: string; password: string; studentId: string }) => void
  setError: (e: string | null) => void
}) {
  const [note, setNote] = useState(a.decisionNote ?? '')

  async function review(body: Record<string, unknown>) {
    setError(null)
    try {
      await api(`/applications/${a.id}`, { method: 'PATCH', body })
      await onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function enroll() {
    setError(null)
    try {
      const res = await api<{ student: { id: string; registrationNumber: string }; temporaryPassword: string }>(`/applications/${a.id}/enroll`, {
        method: 'POST',
      })
      onEnrolled({ name: `${a.firstName} ${a.lastName}`, reg: res.student.registrationNumber, email: a.email, password: res.temporaryPassword, studentId: res.student.id })
      await onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const closed = a.status === 'ENROLLED'

  return (
    <Panel eyebrow={`Applied ${formatDate(a.createdAt)}`} title={`${a.firstName} ${a.lastName}`} actions={<StateBadge status={a.status} />}>
      <dl className="details">
        <div>
          <dt>Programme</dt>
          <dd>
            {a.program.code} · {a.program.name}
          </dd>
        </div>
        <div>
          <dt>Intake</dt>
          <dd>{a.intakeYear}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{a.email}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{a.phone}</dd>
        </div>
        <div>
          <dt>Date of birth</dt>
          <dd>{formatDate(a.dateOfBirth)}</dd>
        </div>
        <div>
          <dt>Previous school</dt>
          <dd>{a.previousSchool}</dd>
        </div>
      </dl>
      {a.reviewedBy && <p className="muted small">Last reviewed by {a.reviewedBy.fullName}</p>}
      {closed ? (
        <p className="notice success">
          Enrolled as <Link to={`/students/${a.student?.id}`}>{a.student?.registrationNumber}</Link>.
        </p>
      ) : (
        <div className="form">
          <label className="switch">
            <input type="checkbox" checked={a.documentsVerified} onChange={(e) => void review({ documentsVerified: e.target.checked })} />
            <span>
              <BadgeCheck size={16} /> Documents verified (certificate, ID, results slip)
            </span>
          </label>
          <Field label="Decision note" hint="Shown in the audit log; required reason when rejecting.">
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="form-actions">
            {a.status === 'SUBMITTED' && (
              <button type="button" className="secondary" onClick={() => void review({ status: 'UNDER_REVIEW' })}>
                Start review
              </button>
            )}
            {a.status !== 'REJECTED' && (
              <button type="button" className="secondary" onClick={() => void review({ status: 'REJECTED', decisionNote: note })}>
                Reject
              </button>
            )}
            {a.status !== 'OFFERED' && (
              <button type="button" disabled={!a.documentsVerified} onClick={() => void review({ status: 'OFFERED', decisionNote: note || undefined })}>
                Issue offer
              </button>
            )}
            {a.status === 'OFFERED' && (
              <button type="button" onClick={() => void enroll()}>
                <GraduationCap size={17} /> Enrol as student
              </button>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
