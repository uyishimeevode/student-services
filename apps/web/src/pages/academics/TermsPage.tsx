import { CalendarPlus, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage, formatDate } from '../../api/client'
import type { Term } from '../../api/types'
import { EmptyState, ErrorNotice, Field, PageHeader, Panel } from '../../components/Field'

export function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })

  const load = useCallback(async () => {
    try {
      setTerms(await api<Term[]>('/terms'))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function update(id: string, body: Partial<Term>) {
    setError(null)
    try {
      await api(`/terms/${id}`, { method: 'PATCH', body })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await api('/terms', { method: 'POST', body: form })
      setForm({ name: '', startDate: '', endDate: '' })
      setOpen(false)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Registry"
        title="Academic terms"
        subtitle="Set the current term and open or close course registration."
        actions={
          !open && (
            <button type="button" onClick={() => setOpen(true)}>
              <CalendarPlus size={18} /> New term
            </button>
          )
        }
      />
      <ErrorNotice error={error} />
      {open && (
        <Panel
          eyebrow="New term"
          title="Create term"
          actions={
            <button type="button" className="icon-only" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          }
        >
          <form className="form" onSubmit={create}>
            <div className="row">
              <Field label="Name">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2026/2027 Semester 2" required />
              </Field>
              <Field label="Starts">
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </Field>
              <Field label="Ends">
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </Field>
            </div>
            <div className="form-actions">
              <button type="submit">Create term</button>
            </div>
          </form>
        </Panel>
      )}
      <div className="stack">
        {terms.map((t) => (
          <div key={t.id} className={`term-row ${t.isCurrent ? 'current' : ''}`}>
            <div className="item-body">
              <strong>{t.name}</strong>
              <small>
                {formatDate(t.startDate)} to {formatDate(t.endDate)}
              </small>
            </div>
            {t.isCurrent ? (
              <>
                <span className="badge active">Current term</span>
                <label className="switch">
                  <input type="checkbox" checked={t.registrationOpen} onChange={(e) => void update(t.id, { registrationOpen: e.target.checked })} />
                  <span>Registration {t.registrationOpen ? 'open' : 'closed'}</span>
                </label>
              </>
            ) : (
              <button type="button" className="secondary small-button" onClick={() => void update(t.id, { isCurrent: true })}>
                Make current
              </button>
            )}
          </div>
        ))}
      </div>
      {terms.length === 0 && <EmptyState title="No terms yet" text="Create the first term to start course registration." />}
    </section>
  )
}
