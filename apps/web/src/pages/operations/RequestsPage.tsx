import { CalendarClock, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorMessage, formatDate, initials, query } from '../../api/client'
import { REQUEST_TYPE_LABELS, type RequestStatus, type RequestType, type ServiceRequest } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, ErrorNotice, Field, PageHeader, Panel, StateBadge } from '../../components/Field'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export function RequestsPage() {
  const { user, can } = useAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [filter, setFilter] = useState('active')
  const [params] = useSearchParams()
  const [type, setType] = useState(params.get('type') ?? '')
  const [assigned, setAssigned] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const status = filter === 'active' ? '' : filter
      const rows = await api<ServiceRequest[]>(`/requests${query({ status, type, assigned })}`)
      setRequests(filter === 'active' ? rows.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS') : rows)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [filter, type, assigned])

  useEffect(() => {
    void load()
  }, [load])

  const selected = requests.find((r) => r.id === selectedId) ?? null

  return (
    <section>
      <PageHeader eyebrow="Student operations" title="Service requests" subtitle="Triage requests, take ownership, reply and book appointments." />
      <ErrorNotice error={error} />
      <div className="toolbar">
        <div className="chips">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} type="button" className={`chip ${filter === f.value ? 'selected' : ''}`} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => (
            <option key={t} value={t}>
              {REQUEST_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>
      <div className="split">
        <Panel className="list-panel">
          <ul className="request-list">
            {requests.map((r) => (
              <li key={r.id}>
                <button type="button" className={`request-item ${selectedId === r.id ? 'selected' : ''}`} onClick={() => setSelectedId(r.id)}>
                  <span className="avatar">{initials(`${r.student.firstName} ${r.student.lastName}`)}</span>
                  <span className="item-body">
                    <strong>{r.subject}</strong>
                    <small>
                      {r.student.firstName} {r.student.lastName} · {REQUEST_TYPE_LABELS[r.type]} · {formatDate(r.createdAt)}
                    </small>
                  </span>
                  <StateBadge status={r.status} />
                </button>
              </li>
            ))}
          </ul>
          {requests.length === 0 && <EmptyState title="No requests here" />}
        </Panel>
        {selected ? (
          <RequestDetail
            key={selected.id}
            request={selected}
            canSeeRecord={can('students.view')}
            myId={user?.id ?? ''}
            onSaved={load}
            setError={setError}
          />
        ) : (
          <Panel>
            <EmptyState title="Select a request" text="Pick a request on the left to work on it." />
          </Panel>
        )}
      </div>
    </section>
  )
}

function RequestDetail({
  request,
  canSeeRecord,
  myId,
  onSaved,
  setError,
}: {
  request: ServiceRequest
  canSeeRecord: boolean
  myId: string
  onSaved: () => Promise<void>
  setError: (e: string | null) => void
}) {
  const [response, setResponse] = useState(request.response ?? '')
  const [appointment, setAppointment] = useState(request.appointmentAt ? request.appointmentAt.slice(0, 16) : '')

  async function update(body: Record<string, unknown>) {
    setError(null)
    try {
      await api(`/requests/${request.id}`, { method: 'PATCH', body })
      await onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const close = (status: RequestStatus) => update({ status, response })

  return (
    <Panel eyebrow={`${REQUEST_TYPE_LABELS[request.type]} · ${formatDate(request.createdAt, true)}`} title={request.subject} actions={<StateBadge status={request.status} />}>
      <div className="request-student">
        <span className="avatar">{initials(`${request.student.firstName} ${request.student.lastName}`)}</span>
        <span className="item-body">
          <strong>
            {request.student.firstName} {request.student.lastName}
          </strong>
          <small>
            {request.student.registrationNumber} · {request.student.program.code}
          </small>
        </span>
        {canSeeRecord && (
          <Link to={`/students/${request.student.id}`} className="button secondary small-button">
            Open record
          </Link>
        )}
      </div>
      <p className="request-body">{request.description}</p>
      <div className="request-owner">
        {request.assignedTo ? (
          <span className="muted">Handled by {request.assignedTo.id === myId ? 'you' : request.assignedTo.fullName}</span>
        ) : (
          <span className="muted">Nobody has taken this request yet.</span>
        )}
        {request.assignedTo?.id !== myId && (
          <button type="button" className="secondary small-button" onClick={() => void update({ assignToMe: true })}>
            <UserCheck size={15} /> Assign to me
          </button>
        )}
      </div>
      <div className="form">
        <Field label="Appointment" hint="Optional. The student sees the date and time.">
          <span className="inline">
            <input type="datetime-local" value={appointment} onChange={(e) => setAppointment(e.target.value)} />
            <button type="button" className="secondary small-button" onClick={() => void update({ appointmentAt: appointment ? new Date(appointment).toISOString() : null })}>
              <CalendarClock size={15} /> Save
            </button>
          </span>
        </Field>
        <Field label="Response to the student" hint="Required before resolving or rejecting.">
          <textarea rows={4} value={response} onChange={(e) => setResponse(e.target.value)} />
        </Field>
        <div className="form-actions">
          {request.status === 'RESOLVED' || request.status === 'REJECTED' ? (
            <button type="button" className="secondary" onClick={() => void update({ status: 'IN_PROGRESS' })}>
              Reopen
            </button>
          ) : (
            <>
              <button type="button" className="secondary" onClick={() => void update({ response })}>
                Save reply
              </button>
              <button type="button" className="secondary" onClick={() => void close('REJECTED')}>
                Reject
              </button>
              <button type="button" onClick={() => void close('RESOLVED')}>
                Resolve
              </button>
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}
