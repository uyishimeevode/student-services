import { ArrowLeft, ExternalLink, Save, Send, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, errorMessage, formatDate } from '../../api/client'
import type { ClassDetail } from '../../api/types'
import { EmptyState, ErrorNotice, Field, MiniStat, PageHeader, Panel, StateBadge, Tabs } from '../../components/Field'

type Tab = 'grades' | 'attendance' | 'materials'

function letter(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

export function ClassPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const [data, setData] = useState<ClassDetail | null>(null)
  const [tab, setTab] = useState<Tab>(() => (['grades', 'attendance', 'materials'].includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'grades'))
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api<ClassDetail>(`/teaching/classes/${id}`))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (!data) return <ErrorNotice error={error} />

  const average = (() => {
    const scores = data.students.map((s) => s.score).filter((s): s is number => s !== null)
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  })()

  return (
    <section>
      <Link to="/classes" className="back-link">
        <ArrowLeft size={16} /> My classes
      </Link>
      <PageHeader
        eyebrow={`${data.course.code} · ${data.term.name}`}
        title={data.course.title}
        subtitle={`${data.course.program.code} year ${data.course.yearLevel} · ${data.course.credits} credits · ${data.lecturer?.fullName ?? 'No lecturer'}`}
        actions={<StateBadge status={data.gradeStatus} />}
      />
      {data.gradeStatus === 'RETURNED' && data.gradeNote && (
        <p className="notice error">Returned by the Head of Department: {data.gradeNote}</p>
      )}
      <ErrorNotice error={error} />
      {notice && <p className="notice success">{notice}</p>}
      <div className="mini-stats">
        <MiniStat label="Students" value={data.students.length} />
        <MiniStat label="Sessions recorded" value={data.sessions.length} tone="amber" />
        <MiniStat label="Average score" value={average ?? '-'} tone="blue" />
        <MiniStat label="Materials" value={data.materials.length} tone="purple" />
      </div>
      <Tabs
        tabs={[
          { value: 'grades', label: 'Class list and grades', count: data.students.length },
          { value: 'attendance', label: 'Attendance', count: data.sessions.length },
          { value: 'materials', label: 'Materials', count: data.materials.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'grades' && <GradesTab data={data} onSaved={load} setError={setError} setNotice={setNotice} />}
      {tab === 'attendance' && <AttendanceTab data={data} onSaved={load} setError={setError} setNotice={setNotice} />}
      {tab === 'materials' && <MaterialsTab data={data} onSaved={load} setError={setError} />}
    </section>
  )
}

interface TabProps {
  data: ClassDetail
  onSaved: () => Promise<void>
  setError: (e: string | null) => void
  setNotice?: (n: string | null) => void
}

function GradesTab({ data, onSaved, setError, setNotice }: TabProps) {
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.students.map((s) => [s.enrollmentId, s.score === null ? '' : String(s.score)])),
  )
  const editable = data.canEdit && data.gradesEditable

  async function save(submit: boolean) {
    setError(null)
    setNotice?.(null)
    try {
      await api(`/teaching/classes/${data.id}/grades`, {
        method: 'PUT',
        body: {
          submit,
          scores: data.students.map((s) => ({
            enrollmentId: s.enrollmentId,
            score: scores[s.enrollmentId] === '' ? null : Number(scores[s.enrollmentId]),
          })),
        },
      })
      setNotice?.(submit ? 'Grades submitted to the Head of Department for approval.' : 'Grades saved as a draft.')
      await onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Panel>
      {!data.gradesEditable && (
        <p className="notice">
          {data.gradeStatus === 'SUBMITTED' ? 'Grades are waiting for approval and cannot be changed.' : 'Grades are approved and published to students.'}
        </p>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Reg. number</th>
            <th>Attendance</th>
            <th>Score (0 to 100)</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((s) => {
            const value = scores[s.enrollmentId] ?? ''
            return (
              <tr key={s.enrollmentId}>
                <td>
                  <strong>
                    {s.firstName} {s.lastName}
                  </strong>
                </td>
                <td className="mono">{s.registrationNumber}</td>
                <td>{s.attendanceRate === null ? '-' : `${s.attendanceRate}%`}</td>
                <td>
                  {editable ? (
                    <input
                      className="score-input"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={value}
                      onChange={(e) => setScores({ ...scores, [s.enrollmentId]: e.target.value })}
                    />
                  ) : (
                    (s.score ?? '-')
                  )}
                </td>
                <td>
                  <strong className="grade">{value === '' ? '-' : letter(Number(value))}</strong>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {data.students.length === 0 && <EmptyState title="No students registered yet" />}
      {editable && data.students.length > 0 && (
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => void save(false)}>
            <Save size={17} /> Save draft
          </button>
          <button type="button" onClick={() => void save(true)}>
            <Send size={17} /> Submit for approval
          </button>
        </div>
      )}
    </Panel>
  )
}

function AttendanceTab({ data, onSaved, setError, setNotice }: TabProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [topic, setTopic] = useState('')
  const [present, setPresent] = useState<Set<string>>(() => new Set(data.students.map((s) => s.enrollmentId)))

  function toggle(id: string) {
    const next = new Set(present)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPresent(next)
  }

  function loadSession(sessionId: string) {
    const s = data.sessions.find((x) => x.id === sessionId)
    if (!s) return
    setDate(s.date.slice(0, 10))
    setTopic(s.topic ?? '')
    setPresent(new Set(s.presentEnrollmentIds))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await api(`/teaching/classes/${data.id}/attendance`, {
        method: 'POST',
        body: { date, topic: topic || undefined, presentEnrollmentIds: [...present] },
      })
      setNotice?.(`Attendance saved for ${formatDate(date)}.`)
      await onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="two-col wide-left">
      {data.canEdit ? (
        <Panel eyebrow="Register" title="Take attendance">
          <form className="form" onSubmit={submit}>
            <div className="row">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Topic">
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Optional" />
              </Field>
            </div>
            <div className="chips">
              <button type="button" className="chip" onClick={() => setPresent(new Set(data.students.map((s) => s.enrollmentId)))}>
                Mark all present
              </button>
              <button type="button" className="chip" onClick={() => setPresent(new Set())}>
                Clear
              </button>
            </div>
            <ul className="check-list">
              {data.students.map((s) => (
                <li key={s.enrollmentId}>
                  <label>
                    <input type="checkbox" checked={present.has(s.enrollmentId)} onChange={() => toggle(s.enrollmentId)} />
                    <span>
                      {s.firstName} {s.lastName}
                    </span>
                    <small className="muted">{s.registrationNumber}</small>
                  </label>
                </li>
              ))}
            </ul>
            <div className="form-actions">
              <span className="muted small">
                {present.size} of {data.students.length} present
              </span>
              <button type="submit">Save attendance</button>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel>
          <p className="muted">Only the assigned lecturer can take attendance.</p>
        </Panel>
      )}
      <Panel eyebrow="History" title="Sessions">
        <ul className="item-list">
          {data.sessions.map((s) => (
            <li key={s.id}>
              <span className="item-body">
                <strong>{formatDate(s.date)}</strong>
                <small>{s.topic ?? 'No topic'}</small>
              </span>
              <span className="muted">
                {s.present}/{s.total}
              </span>
              {data.canEdit && (
                <button type="button" className="secondary small-button" onClick={() => loadSession(s.id)}>
                  Edit
                </button>
              )}
            </li>
          ))}
        </ul>
        {data.sessions.length === 0 && <EmptyState title="No sessions yet" />}
      </Panel>
    </div>
  )
}

function MaterialsTab({ data, onSaved, setError }: TabProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  async function add(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await api(`/teaching/classes/${data.id}/materials`, { method: 'POST', body: { title, url } })
      setTitle('')
      setUrl('')
      await onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(materialId: string) {
    setError(null)
    try {
      await api(`/teaching/classes/${data.id}/materials/${materialId}`, { method: 'DELETE' })
      await onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="two-col wide-left">
      <Panel eyebrow="Shared with students" title="Materials">
        <ul className="item-list">
          {data.materials.map((m) => (
            <li key={m.id}>
              <span className="item-body">
                <strong>{m.title}</strong>
                <small>{formatDate(m.createdAt)}</small>
              </span>
              <a href={m.url} target="_blank" rel="noreferrer" className="button secondary small-button">
                <ExternalLink size={15} /> Open
              </a>
              {data.canEdit && (
                <button type="button" className="icon-only" aria-label="Remove" onClick={() => void remove(m.id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {data.materials.length === 0 && <EmptyState title="No materials yet" />}
      </Panel>
      {data.canEdit && (
        <Panel eyebrow="Share" title="Add material">
          <form className="form" onSubmit={add}>
            <Field label="Title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
            </Field>
            <Field label="Link" hint="Google Drive, OneDrive or any web link.">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://" />
            </Field>
            <button type="submit">Share with class</button>
          </form>
        </Panel>
      )}
    </div>
  )
}
