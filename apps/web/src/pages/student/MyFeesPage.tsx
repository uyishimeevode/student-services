import { Wallet } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage, formatDate, money } from '../../api/client'
import type { Invoice, PaymentMethod } from '../../api/types'
import { EmptyState, ErrorNotice, Field, MiniStat, PageHeader, Panel, StateBadge } from '../../components/Field'

interface Fees {
  invoices: Invoice[]
  totals: { due: number; paid: number; pending: number; balance: number }
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash at the finance office' },
]

export function MyFeesPage() {
  const [data, setData] = useState<Fees | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)
  const [form, setForm] = useState({ amount: '', method: 'MOBILE_MONEY' as PaymentMethod, reference: '' })
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api<Fees>('/my/fees'))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function pay(event: FormEvent, invoice: Invoice) {
    event.preventDefault()
    setError(null)
    try {
      await api(`/my/fees/${invoice.id}/payments`, {
        method: 'POST',
        body: { amount: Number(form.amount), method: form.method, reference: form.reference },
      })
      setNotice('Payment submitted. The finance office will verify it against your reference.')
      setPaying(null)
      setForm({ amount: '', method: 'MOBILE_MONEY', reference: '' })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <PageHeader eyebrow="Finance" title="My fees" subtitle="Pay, then record your payment reference here so Finance can verify it." />
      <ErrorNotice error={error} />
      {notice && <p className="notice success">{notice}</p>}
      {data && (
        <>
          <div className="mini-stats">
            <MiniStat label="Total due" value={money(data.totals.due)} />
            <MiniStat label="Paid" value={money(data.totals.paid)} tone="blue" />
            <MiniStat label="Awaiting verification" value={money(data.totals.pending)} tone="amber" />
            <MiniStat label="Balance" value={money(data.totals.balance)} tone="purple" />
          </div>
          <div className="stack">
            {data.invoices.map((inv) => (
              <Panel
                key={inv.id}
                eyebrow={inv.term?.name ?? 'Invoice'}
                title={inv.description}
                actions={<StateBadge status={inv.status} />}
              >
                <dl className="details four">
                  <div>
                    <dt>Amount</dt>
                    <dd>{money(inv.amount)}</dd>
                  </div>
                  <div>
                    <dt>Waiver</dt>
                    <dd>{inv.waiverAmount ? `${money(inv.waiverAmount)} · ${inv.waiverReason}` : 'None'}</dd>
                  </div>
                  <div>
                    <dt>Balance</dt>
                    <dd>{money(inv.balance)}</dd>
                  </div>
                  <div>
                    <dt>Due date</dt>
                    <dd>{formatDate(inv.dueDate)}</dd>
                  </div>
                </dl>
                {inv.payments.length > 0 && (
                  <table className="data-table compact">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reference</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.createdAt)}</td>
                          <td className="mono">{p.reference}</td>
                          <td>{METHODS.find((m) => m.value === p.method)?.label}</td>
                          <td>{money(p.amount)}</td>
                          <td>
                            <StateBadge status={p.status} />
                            {p.note && <small className="muted block">{p.note}</small>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {inv.balance - inv.pending > 0 &&
                  (paying === inv.id ? (
                    <form className="inline-form" onSubmit={(e) => void pay(e, inv)}>
                      <div className="row">
                        <Field label="Amount (RWF)" hint={`Up to ${money(inv.balance - inv.pending)}`}>
                          <input type="number" min={1} max={inv.balance - inv.pending} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                        </Field>
                        <Field label="Method">
                          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
                            {METHODS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Transaction reference">
                          <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} required minLength={3} />
                        </Field>
                      </div>
                      <div className="form-actions">
                        <button type="button" className="secondary" onClick={() => setPaying(null)}>
                          Cancel
                        </button>
                        <button type="submit">Submit payment</button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setPaying(inv.id)}>
                      <Wallet size={17} /> Record a payment
                    </button>
                  ))}
              </Panel>
            ))}
          </div>
          {data.invoices.length === 0 && <EmptyState title="No invoices" text="You have nothing to pay at the moment." />}
        </>
      )}
    </section>
  )
}
