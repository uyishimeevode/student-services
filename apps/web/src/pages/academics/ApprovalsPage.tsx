import { Check, Eye, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import type { Offering } from '../../api/types'
import { EmptyState, ErrorNotice, PageHeader, Panel } from '../../components/Field'

export function ApprovalsPage() {
  const [pending, setPending] = useState<Offering[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setPending(await api<Offering[]>('/grade-approvals'))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function decide(o: Offering, decision: 'APPROVE' | 'RETURN') {
    setError(null)
    try {
      await api(`/grade-approvals/${o.id}`, { method: 'POST', body: { decision, note: notes[o.id] || undefined } })
      setNotice(decision === 'APPROVE' ? `${o.course.code} grades approved and published.` : `${o.course.code} grades returned to the lecturer.`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <PageHeader eyebrow="Academic delivery" title="Grade approvals" subtitle="Check submitted grades, then publish them to students or return them with a reason." />
      <ErrorNotice error={error} />
      {notice && <p className="notice success">{notice}</p>}
      <div className="stack">
        {pending.map((o) => (
          <Panel
            key={o.id}
            eyebrow={`${o.course.code} · ${o.term.name}`}
            title={o.course.title}
            actions={
              <Link to={`/classes/${o.id}`} className="button secondary small-button">
                <Eye size={15} /> Review grades
              </Link>
            }
          >
            <p className="muted">
              {o.lecturer?.fullName ?? 'No lecturer'} · {o._count.enrollments} students · {o.course.credits} credits
            </p>
            <div className="decision">
              <input placeholder="Reason, required when returning" value={notes[o.id] ?? ''} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
              <button type="button" className="secondary" onClick={() => void decide(o, 'RETURN')}>
                <Undo2 size={16} /> Return
              </button>
              <button type="button" onClick={() => void decide(o, 'APPROVE')}>
                <Check size={16} /> Approve and publish
              </button>
            </div>
          </Panel>
        ))}
      </div>
      {pending.length === 0 && <EmptyState title="Nothing waiting for approval" />}
    </section>
  )
}
