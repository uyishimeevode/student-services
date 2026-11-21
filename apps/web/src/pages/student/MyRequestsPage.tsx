import { CalendarClock, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage, formatDate } from '../../api/client'
import { REQUEST_TYPE_LABELS, type RequestType, type ServiceRequest } from '../../api/types'
import { EmptyState, ErrorNotice, Field, PageHeader, Panel, StateBadge } from '../../components/Field'

const empty = { type: 'LETTER' as RequestType, subject: '', description: '' }

export function MyRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)

  const load = useCallback(async () => {
    try {
      setRequests(await api<ServiceRequest[]>('/my/requests'))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await api('/my/requests', { method: 'POST', body: form })
      setForm(empty)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Student services"
        title="My requests"
        subtitle="Ask for letters, transcripts, appointments or corrections to your record."
        actions={
          !showForm && (
            <button type="button" onClick={() => setShowForm(true)}>
              <Plus size={18} /> New request
            </button>
          )
        }
      />
      <ErrorNotice error={error} />
      {showForm && (
        <Panel
          eyebrow="New request"
          title="What do you need?"
          actions={
            <button type="button" className="icon-only" aria-label="Close" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          }
        >
          <form className="form" onSubmit={submit}>
            <div className="chips">
              {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => (
                <button key={t} type="button" className={`chip ${form.type === t ? 'selected' : ''}`} onClick={() => setForm({ ...form, type: t })}>
                  {REQUEST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <Field label="Subject">
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required minLength={3} />
            </Field>
            <Field label="Details" hint={form.type === 'APPOINTMENT' ? 'Say what it is about and when you are available.' : undefined}>
              <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={5} />
            </Field>
            <div className="form-actions">
              <button type="submit">Submit request</button>
            </div>
          </form>
        </Panel>
      )}
      <div className="stack">
        {requests.map((r) => (
          <Panel key={r.id} eyebrow={`${REQUEST_TYPE_LABELS[r.type]} · ${formatDate(r.createdAt)}`} title={r.subject} actions={<StateBadge status={r.status} />}>
            <p className="muted">{r.description}</p>
            {r.appointmentAt && (
              <p className="notice">
                <CalendarClock size={16} /> Appointment on {formatDate(r.appointmentAt, true)}
              </p>
            )}
            {r.response && (
              <div className="reply">
                <small>{r.assignedTo?.fullName ?? 'Student services'} replied</small>
                <p>{r.response}</p>
              </div>
            )}
            {!r.response && r.assignedTo && <small className="muted">Handled by {r.assignedTo.fullName}</small>}
          </Panel>
        ))}
      </div>
      {requests.length === 0 && !showForm && <EmptyState title="No requests yet" />}
    </section>
  )
}
