import { Check, FilePlus2, Percent, Search, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage, formatDate, money, query } from '../../api/client'
import type { FinanceTotals, Invoice, Page, Payment, Program, Student, Term } from '../../api/types'
import { EmptyState, ErrorNotice, Field, MiniStat, PageHeader, Panel, StateBadge, Tabs } from '../../components/Field'

type Tab = 'payments' | 'invoices' | 'waivers' | 'report'

interface Report {
  totals: FinanceTotals
  collectionRate: number
  byProgram: (FinanceTotals & { id: string; code: string; name: string })[]
}

const METHOD_LABEL = { MOBILE_MONEY: 'Mobile money', BANK_TRANSFER: 'Bank transfer', CASH: 'Cash' }

export function FinancePage() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = params.get('tab')
    return t === 'invoices' || t === 'waivers' || t === 'report' ? t : 'payments'
  })
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    try {
      setReport(await api<Report>('/finance/report'))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  return (
    <section>
      <PageHeader eyebrow="Student operations" title="Finance" subtitle="Bill students, verify their payments, apply waivers and follow collections." />
      <ErrorNotice error={error} />
      {report && (
        <div className="mini-stats">
          <MiniStat label="Billed" value={money(report.totals.billed)} />
          <MiniStat label="Collected" value={money(report.totals.collected)} tone="blue" />
          <MiniStat label="Awaiting verification" value={money(report.totals.pending)} tone="amber" />
          <MiniStat label="Outstanding" value={money(report.totals.outstanding)} tone="purple" />
        </div>
      )}
      <Tabs
        tabs={[
          { value: 'payments', label: 'Payments to verify' },
          { value: 'invoices', label: 'Invoices' },
          { value: 'waivers', label: 'Scholarships and waivers' },
          { value: 'report', label: 'Report' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'payments' && <PaymentsTab onChange={loadReport} setError={setError} />}
      {tab === 'invoices' && <InvoicesTab onChange={loadReport} setError={setError} />}
      {tab === 'waivers' && <InvoicesTab onChange={loadReport} setError={setError} waiversOnly />}
      {tab === 'report' && report && <ReportTab report={report} />}
    </section>
  )
}

function PaymentsTab({ onChange, setError }: { onChange: () => Promise<void>; setError: (e: string | null) => void }) {
  const [status, setStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING')
  const [payments, setPayments] = useState<Payment[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      setPayments(await api<Payment[]>(`/finance/payments?status=${status}`))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [status, setError])

  useEffect(() => {
    void load()
  }, [load])

  async function review(p: Payment, decision: 'VERIFIED' | 'REJECTED') {
    setError(null)
    try {
      await api(`/finance/payments/${p.id}`, { method: 'PATCH', body: { status: decision, note: notes[p.id] || undefined } })
      await Promise.all([load(), onChange()])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Panel>
      <div className="chips">
        {(['PENDING', 'VERIFIED', 'REJECTED'] as const).map((s) => (
          <button key={s} type="button" className={`chip ${status === s ? 'selected' : ''}`} onClick={() => setStatus(s)}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Invoice</th>
            <th>Reference</th>
            <th>Amount</th>
            <th>Submitted</th>
            <th>{status === 'PENDING' ? 'Decision' : 'Status'}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>
                <span className="person">
                  <span>
                    <strong>
                      {p.invoice?.student.firstName} {p.invoice?.student.lastName}
                    </strong>
                    <small>{p.invoice?.student.registrationNumber}</small>
                  </span>
                </span>
              </td>
              <td>{p.invoice?.description}</td>
              <td>
                <span className="mono">{p.reference}</span>
                <small className="muted block">{METHOD_LABEL[p.method]}</small>
              </td>
              <td>
                <strong>{money(p.amount)}</strong>
              </td>
              <td>{formatDate(p.createdAt)}</td>
              <td>
                {status === 'PENDING' ? (
                  <span className="decision compact">
                    <input placeholder="Note" value={notes[p.id] ?? ''} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} />
                    <button type="button" className="secondary small-button" onClick={() => void review(p, 'REJECTED')}>
                      <X size={15} /> Reject
                    </button>
                    <button type="button" className="small-button" onClick={() => void review(p, 'VERIFIED')}>
                      <Check size={15} /> Verify
                    </button>
                  </span>
                ) : (
                  <>
                    <StateBadge status={p.status} />
                    {p.note && <small className="muted block">{p.note}</small>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {payments.length === 0 && <EmptyState title={status === 'PENDING' ? 'No payments waiting' : 'Nothing here'} />}
    </Panel>
  )
}

function InvoicesTab({
  onChange,
  setError,
  waiversOnly = false,
}: {
  onChange: () => Promise<void>
  setError: (e: string | null) => void
  waiversOnly?: boolean
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [waiverFor, setWaiverFor] = useState<string | null>(null)
  const [waiver, setWaiver] = useState({ amount: '', reason: '' })

  const load = useCallback(async () => {
    try {
      const rows = await api<Invoice[]>(`/finance/invoices${query({ search, status })}`)
      setInvoices(waiversOnly ? rows.filter((i) => i.waiverAmount > 0) : rows)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [search, status, setError, waiversOnly])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  async function applyWaiver(event: FormEvent, id: string) {
    event.preventDefault()
    setError(null)
    try {
      await api(`/finance/invoices/${id}/waiver`, { method: 'PATCH', body: { amount: Number(waiver.amount), reason: waiver.reason } })
      setWaiverFor(null)
      setWaiver({ amount: '', reason: '' })
      await Promise.all([load(), onChange()])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      {waiversOnly && (
        <p className="notice">
          Invoices with a scholarship or waiver. To grant a new one, open the Invoices tab, find the student and press Waiver.
        </p>
      )}
      {creating ? (
        <CreateInvoices
          onDone={async () => {
            setCreating(false)
            await Promise.all([load(), onChange()])
          }}
          onCancel={() => setCreating(false)}
          setError={setError}
        />
      ) : (
        <div className="toolbar">
          <label className="search-field">
            <Search size={18} />
            <input placeholder="Search by student name or registration number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All invoices</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partly paid</option>
            <option value="PAID">Paid</option>
          </select>
          <button type="button" onClick={() => setCreating(true)}>
            <FilePlus2 size={18} /> Create invoices
          </button>
        </div>
      )}
      <Panel>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Waiver</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className="person">
                    <span>
                      <strong>
                        {i.student.firstName} {i.student.lastName}
                      </strong>
                      <small>
                        {i.student.registrationNumber} · {i.student.program.code}
                      </small>
                    </span>
                  </span>
                </td>
                <td>
                  {i.description}
                  <small className="muted block">Due {formatDate(i.dueDate)}</small>
                </td>
                <td>{money(i.amount)}</td>
                <td>{i.waiverAmount ? money(i.waiverAmount) : '-'}</td>
                <td>{money(i.paid)}</td>
                <td>
                  <strong>{money(i.balance)}</strong>
                </td>
                <td>
                  <StateBadge status={i.status} />
                </td>
                <td className="actions">
                  {waiverFor === i.id ? (
                    <form className="decision compact" onSubmit={(e) => void applyWaiver(e, i.id)}>
                      <input type="number" min={0} max={i.amount} placeholder="Amount" value={waiver.amount} onChange={(e) => setWaiver({ ...waiver, amount: e.target.value })} required />
                      <input placeholder="Reason" value={waiver.reason} onChange={(e) => setWaiver({ ...waiver, reason: e.target.value })} required minLength={3} />
                      <button type="submit" className="small-button">
                        Save
                      </button>
                      <button type="button" className="icon-only" aria-label="Cancel" onClick={() => setWaiverFor(null)}>
                        <X size={16} />
                      </button>
                    </form>
                  ) : (
                    <button type="button" className="secondary small-button" onClick={() => setWaiverFor(i.id)}>
                      <Percent size={15} /> Waiver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <EmptyState title="No invoices match" />}
      </Panel>
    </>
  )
}

function CreateInvoices({ onDone, onCancel, setError }: { onDone: () => Promise<void>; onCancel: () => void; setError: (e: string | null) => void }) {
  const [mode, setMode] = useState<'programme' | 'student'>('programme')
  const [programs, setPrograms] = useState<Program[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [matches, setMatches] = useState<Student[]>([])
  const [form, setForm] = useState({ programId: '', yearOfStudy: '1', studentId: '', termId: '', description: 'Tuition fee', amount: '', dueDate: '' })
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    api<Program[]>('/programs').then(setPrograms).catch(() => undefined)
    api<Term[]>('/terms')
      .then((t) => {
        setTerms(t)
        setForm((f) => ({ ...f, termId: t.find((x) => x.isCurrent)?.id ?? '' }))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (mode !== 'student' || studentSearch.length < 2) return
    const t = setTimeout(() => {
      api<Page<Student>>(`/students${query({ search: studentSearch, limit: 8 })}`)
        .then((p) => setMatches(p.items))
        .catch(() => undefined)
    }, 250)
    return () => clearTimeout(t)
  }, [studentSearch, mode])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const body =
        mode === 'student'
          ? { studentId: form.studentId, termId: form.termId || undefined, description: form.description, amount: Number(form.amount), dueDate: form.dueDate }
          : {
              programId: form.programId,
              yearOfStudy: Number(form.yearOfStudy),
              termId: form.termId || undefined,
              description: form.description,
              amount: Number(form.amount),
              dueDate: form.dueDate,
            }
      const res = await api<{ created: number }>('/finance/invoices', { method: 'POST', body })
      setResult(`${res.created} invoice${res.created === 1 ? '' : 's'} created.`)
      await onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Panel
      eyebrow="Billing"
      title="Create invoices"
      actions={
        <button type="button" className="icon-only" aria-label="Close" onClick={onCancel}>
          <X size={18} />
        </button>
      }
    >
      {result && <p className="notice success">{result}</p>}
      <form className="form" onSubmit={submit}>
        <div className="chips">
          <button type="button" className={`chip ${mode === 'programme' ? 'selected' : ''}`} onClick={() => setMode('programme')}>
            A whole class
          </button>
          <button type="button" className={`chip ${mode === 'student' ? 'selected' : ''}`} onClick={() => setMode('student')}>
            One student
          </button>
        </div>
        {mode === 'programme' ? (
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
            <Field label="Year of study" hint="Every active student in this year is billed.">
              <input type="number" min={1} max={7} value={form.yearOfStudy} onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })} />
            </Field>
          </div>
        ) : (
          <Field label="Student">
            <input placeholder="Type a name or registration number" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
            {matches.length > 0 && (
              <div className="chips">
                {matches.map((s) => (
                  <button key={s.id} type="button" className={`chip ${form.studentId === s.id ? 'selected' : ''}`} onClick={() => setForm({ ...form, studentId: s.id })}>
                    {s.firstName} {s.lastName} · {s.registrationNumber}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}
        <div className="row">
          <Field label="Description">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <Field label="Amount (RWF)">
            <input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </Field>
          <Field label="Due date">
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          </Field>
          <Field label="Term">
            <select value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
              <option value="">None</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={mode === 'student' && !form.studentId}>
            Create
          </button>
        </div>
      </form>
    </Panel>
  )
}

function ReportTab({ report }: { report: Report }) {
  return (
    <Panel eyebrow={`Collection rate ${report.collectionRate}%`} title="Collections by programme">
      <table className="data-table">
        <thead>
          <tr>
            <th>Programme</th>
            <th>Invoices</th>
            <th>Billed</th>
            <th>Waived</th>
            <th>Collected</th>
            <th>Pending</th>
            <th>Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {report.byProgram.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.code}</strong> <span className="muted">{p.name}</span>
              </td>
              <td>{p.invoices}</td>
              <td>{money(p.billed)}</td>
              <td>{money(p.waived)}</td>
              <td>{money(p.collected)}</td>
              <td>{money(p.pending)}</td>
              <td>
                <strong>{money(p.outstanding)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {report.byProgram.length === 0 && <EmptyState title="No invoices yet" />}
    </Panel>
  )
}
