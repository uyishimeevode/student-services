import { Plus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import type { Course, Offering, Program, Term } from '../../api/types'
import { EmptyState, ErrorNotice, Field, PageHeader, Panel, StateBadge, Tabs } from '../../components/Field'

type Tab = 'offerings' | 'catalogue'
interface Lecturer {
  id: string
  fullName: string
  email: string
}

export function CoursesPage() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'catalogue' ? 'catalogue' : 'offerings')
  const [terms, setTerms] = useState<Term[]>([])
  const [termId, setTermId] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [t, c, p, l] = await Promise.all([
        api<Term[]>('/terms'),
        api<Course[]>('/courses'),
        api<Program[]>('/programs'),
        api<Lecturer[]>('/offerings/lecturers'),
      ])
      setTerms(t)
      setCourses(c)
      setPrograms(p)
      setLecturers(l)
      setTermId((current) => current || t.find((x) => x.isCurrent)?.id || t[0]?.id || '')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  const loadOfferings = useCallback(async () => {
    if (!termId) return
    try {
      setOfferings(await api<Offering[]>(`/offerings?termId=${termId}`))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [termId])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    void loadOfferings()
  }, [loadOfferings])

  const offeredIds = useMemo(() => new Set(offerings.map((o) => o.course.id)), [offerings])
  const notOffered = courses.filter((c) => !offeredIds.has(c.id))

  async function assign(offeringId: string, lecturerId: string) {
    setError(null)
    try {
      await api(`/offerings/${offeringId}/lecturer`, { method: 'PATCH', body: { lecturerId: lecturerId || null } })
      await loadOfferings()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function offer(courseId: string) {
    setError(null)
    try {
      await api('/offerings', { method: 'POST', body: { courseId, termId } })
      await loadOfferings()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <PageHeader eyebrow="Academics" title="Courses and lecturers" subtitle="Decide which courses run each term and who teaches them." />
      <ErrorNotice error={error} />
      <Tabs
        tabs={[
          { value: 'offerings', label: 'Classes this term', count: offerings.length },
          { value: 'catalogue', label: 'Course catalogue', count: courses.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'offerings' && (
        <>
          <div className="toolbar">
            <select value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <Panel>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Year</th>
                  <th>Students</th>
                  <th>Grades</th>
                  <th>Lecturer</th>
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="person">
                        <span className="code-chip">{o.course.code}</span>
                        <span>
                          <strong>{o.course.title}</strong>
                          <small>
                            {o.course.program.code} · {o.course.credits} credits
                          </small>
                        </span>
                      </span>
                    </td>
                    <td>{o.course.yearLevel}</td>
                    <td>{o._count.enrollments}</td>
                    <td>
                      <StateBadge status={o.gradeStatus} />
                    </td>
                    <td>
                      <select className={o.lecturer ? '' : 'warn'} value={o.lecturer?.id ?? ''} onChange={(e) => void assign(o.id, e.target.value)}>
                        <option value="">Not assigned</option>
                        {lecturers.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.fullName}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {offerings.length === 0 && <EmptyState title="No classes in this term yet" text="Offer courses from the list below." />}
          </Panel>
          {notOffered.length > 0 && (
            <Panel eyebrow="Not offered this term" title="Add classes">
              <ul className="item-list">
                {notOffered.map((c) => (
                  <li key={c.id}>
                    <span className="code-chip">{c.code}</span>
                    <span className="item-body">
                      <strong>{c.title}</strong>
                      <small>
                        {c.program?.code} · Year {c.yearLevel}, semester {c.semester} · {c.credits} credits
                      </small>
                    </span>
                    <button type="button" className="secondary small-button" onClick={() => void offer(c.id)}>
                      <Plus size={15} /> Offer
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
      {tab === 'catalogue' && <Catalogue courses={courses} programs={programs} onCreated={load} setError={setError} />}
    </section>
  )
}

function Catalogue({
  courses,
  programs,
  onCreated,
  setError,
}: {
  courses: Course[]
  programs: Program[]
  onCreated: () => Promise<void>
  setError: (e: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: '', title: '', credits: '3', yearLevel: '1', semester: '1', programId: '' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await api('/courses', {
        method: 'POST',
        body: { ...form, credits: Number(form.credits), yearLevel: Number(form.yearLevel), semester: Number(form.semester) },
      })
      setForm({ ...form, code: '', title: '' })
      setOpen(false)
      await onCreated()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      {open ? (
        <Panel
          eyebrow="New course"
          title="Add to catalogue"
          actions={
            <button type="button" className="icon-only" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          }
        >
          <form className="form" onSubmit={submit}>
            <div className="row">
              <Field label="Code">
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="BIT1101" />
              </Field>
              <Field label="Title">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
            </div>
            <div className="row">
              <Field label="Programme">
                <select value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })} required>
                  <option value="">Select</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Credits">
                <input type="number" min={1} max={30} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
              </Field>
              <Field label="Year">
                <input type="number" min={1} max={7} value={form.yearLevel} onChange={(e) => setForm({ ...form, yearLevel: e.target.value })} />
              </Field>
              <Field label="Semester">
                <input type="number" min={1} max={3} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </Field>
            </div>
            <div className="form-actions">
              <button type="submit">Add course</button>
            </div>
          </form>
        </Panel>
      ) : (
        <div className="toolbar">
          <button type="button" onClick={() => setOpen(true)}>
            <Plus size={18} /> New course
          </button>
        </div>
      )}
      <Panel>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Programme</th>
              <th>Year</th>
              <th>Semester</th>
              <th>Credits</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="code-chip">{c.code}</span>
                </td>
                <td>{c.title}</td>
                <td>{c.program?.code}</td>
                <td>{c.yearLevel}</td>
                <td>{c.semester}</td>
                <td>{c.credits}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && <EmptyState title="No courses yet" />}
      </Panel>
    </>
  )
}
