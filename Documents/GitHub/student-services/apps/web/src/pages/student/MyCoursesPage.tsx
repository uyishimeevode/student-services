import { ChevronDown, ChevronUp, ExternalLink, FileText, PackagePlus, Wallet } from 'lucide-react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, formatDate, money } from '../../api/client'
import type { Material, ModuleRow, MyCourses } from '../../api/types'
import { EmptyState, ErrorNotice, Field, MiniStat, PageHeader, Panel, StateBadge } from '../../components/Field'

/** Module registration in the University of Kigali style: book into a basket, get an invoice per module, then register. */
export function MyCoursesPage() {
  const [data, setData] = useState<MyCourses | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [registerFor, setRegisterFor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [openHistory, setOpenHistory] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [courses, mats] = await Promise.all([api<MyCourses>('/my/courses'), api<Material[]>('/my/materials')])
      setData(courses)
      setMaterials(mats)
      if (courses.term) setRegisterFor((current) => current || courses.term!.id)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(message)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const bookAll = () =>
    run(
      'book',
      () => api('/my/courses/book', { method: 'POST', body: { offeringIds: data!.available.map((o) => o.id) } }),
      'Modules added to your basket. Get the invoice for each module, then register it.',
    )
  const invoice = (m: ModuleRow) =>
    run(m.enrollmentId, () => api(`/my/courses/${m.enrollmentId}/invoice`, { method: 'POST' }), `Invoice created for ${m.course.code}.`)
  const register = (m: ModuleRow) =>
    run(m.enrollmentId, () => api(`/my/courses/${m.enrollmentId}/register`, { method: 'POST' }), `${m.course.code} is registered.`)
  const drop = (m: ModuleRow) =>
    run(m.enrollmentId, () => api(`/my/courses/${m.enrollmentId}`, { method: 'DELETE' }), `${m.course.code} was dropped.`)

  const term = data?.term
  const open = term?.registrationOpen ?? false
  const rows = [...(data?.basket ?? []), ...(data?.registered ?? [])]

  return (
    <section>
      <PageHeader
        eyebrow="Academics"
        title="Module registration"
        subtitle={term ? `${term.name} · ${formatDate(term.startDate)} to ${formatDate(term.endDate)}` : 'No term is open for registration.'}
      />
      <ErrorNotice error={error} />
      {notice && <p className="notice success">{notice}</p>}

      {term && (
        <>
          <div className="mini-stats">
            <MiniStat label="Registered modules" value={data!.registered.length} />
            <MiniStat label="Credits" value={data!.totalCredits ?? 0} tone="amber" />
            <MiniStat label="Fee per credit" value={money(term.feePerCredit)} tone="blue" />
            <MiniStat label="Registration" value={open ? 'Open' : 'Closed'} tone="purple" />
          </div>

          <Panel eyebrow="Step 1" title="Register for">
            <div className="register-for">
              <Field label="Select the registration, then get the modules to book">
                <select value={registerFor} onChange={(e) => setRegisterFor(e.target.value)}>
                  <option value="">----</option>
                  <option value={term.id}>
                    {term.name}: year {data!.available[0]?.course.yearLevel ?? data!.registered[0]?.course.yearLevel ?? ''} modules
                  </option>
                </select>
              </Field>
              <div className="register-actions">
                <button
                  type="button"
                  className="danger"
                  disabled={!open || !registerFor || data!.available.length === 0 || busy === 'book'}
                  onClick={() => void bookAll()}
                >
                  <PackagePlus size={17} /> Get modules to book
                </button>
                <Link to="/my/fees" className="button teal">
                  <Wallet size={17} /> Make payment
                </Link>
              </div>
            </div>
            {!open && <p className="notice">Module registration is closed. Contact the Registrar if you need a change.</p>}
            {open && data!.available.length > 0 && (
              <p className="muted small">
                {data!.available.length} module{data!.available.length === 1 ? '' : 's'} not yet booked:{' '}
                {data!.available.map((o) => o.course.code).join(', ')}
              </p>
            )}
          </Panel>

          <Panel eyebrow="Step 2" title="Basket modules list">
            <div className="table-scroll">
              <table className="data-table dark-head">
                <thead>
                  <tr>
                    <th>Module code</th>
                    <th>Unit name</th>
                    <th>Credits</th>
                    <th>Semester</th>
                    <th>Lecturer</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.enrollmentId} className={m.status === 'BOOKED' ? 'muted-row' : ''}>
                      <td className="mono">{m.course.code}</td>
                      <td>{m.course.title}</td>
                      <td>{m.course.credits}</td>
                      <td>{m.term.name}</td>
                      <td>{m.lecturer?.fullName ?? '-'}</td>
                      <td>
                        {money(m.fee)}
                        {m.invoice && <small className="muted block">Balance {money(m.invoice.balance)}</small>}
                      </td>
                      <td>
                        {m.status === 'REGISTERED' ? <StateBadge status="REGISTERED" /> : <span className="badge neutral">In basket</span>}
                        {m.invoice && (
                          <span className="spaced">
                            <StateBadge status={m.invoice.status} />
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="action-group">
                          {m.status === 'BOOKED' && !m.invoice && (
                            <button type="button" className="danger small-button" disabled={busy === m.enrollmentId} onClick={() => void invoice(m)}>
                              <FileText size={14} /> Get invoice
                            </button>
                          )}
                          {m.status === 'BOOKED' && m.invoice && (
                            <button type="button" className="teal small-button" disabled={!open || busy === m.enrollmentId} onClick={() => void register(m)}>
                              Register module
                            </button>
                          )}
                          {m.canDrop && (
                            <button type="button" className="secondary small-button" disabled={busy === m.enrollmentId} onClick={() => void drop(m)}>
                              Drop
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <EmptyState title="Your basket is empty" text="Choose the registration above, then press Get modules to book." />}
          </Panel>

          <Panel eyebrow="From your lecturers" title="Course materials">
            <ul className="item-list">
              {materials.map((m) => (
                <li key={m.id}>
                  <span className="code-chip">{m.offering?.course.code}</span>
                  <span className="item-body">
                    <strong>{m.title}</strong>
                    <small>Shared {formatDate(m.createdAt)}</small>
                  </span>
                  <a href={m.url} target="_blank" rel="noreferrer" className="button secondary small-button">
                    <ExternalLink size={15} /> Open
                  </a>
                </li>
              ))}
            </ul>
            {materials.length === 0 && <EmptyState title="No materials shared yet" />}
          </Panel>
        </>
      )}

      <Panel eyebrow="All terms" title="Registration list">
        <div className="table-scroll">
          <table className="data-table dark-head">
            <thead>
              <tr>
                <th>Action</th>
                <th>Stage</th>
                <th>Semester</th>
                <th>Units taken</th>
                <th>Credits</th>
                <th>Registration date</th>
                <th>Total billed</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {(data?.history ?? []).map((h) => (
                <Fragment key={h.termId}>
                  <tr>
                    <td>
                      <button type="button" className="danger small-button" onClick={() => setOpenHistory(openHistory === h.termId ? null : h.termId)}>
                        {openHistory === h.termId ? <ChevronUp size={14} /> : <ChevronDown size={14} />} View units
                      </button>
                    </td>
                    <td>{h.stage}</td>
                    <td>{h.term}</td>
                    <td>{h.units}</td>
                    <td>{h.credits}</td>
                    <td>{formatDate(h.registeredAt)}</td>
                    <td>{money(h.billed)}</td>
                    <td>{money(h.paid)}</td>
                    <td>
                      <strong>{money(h.balance)}</strong>
                    </td>
                  </tr>
                  {openHistory === h.termId && (
                    <tr className="expanded-row">
                      <td colSpan={9}>
                        <ul className="unit-list">
                          {h.modules.map((m) => (
                            <li key={m.code}>
                              <span className="code-chip">{m.code}</span> {m.title} <span className="muted">· {m.credits} credits</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.history.length === 0 && <EmptyState title="No registrations yet" />}
      </Panel>
    </section>
  )
}
