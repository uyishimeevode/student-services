import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, errorMessage, formatDate, money } from '../../api/client'
import type { Invoice, Payment } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, ErrorNotice, PageHeader, Panel } from '../../components/Field'

const METHOD = { MOBILE_MONEY: 'Mobile money', BANK_TRANSFER: 'Bank transfer', CASH: 'Cash' }

type Receipt = Payment & { invoiceDescription: string; term: string | null }

/** Verified payments, each printable as a receipt. */
export function MyReceiptsPage() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [selected, setSelected] = useState<Receipt | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ invoices: Invoice[] }>('/my/fees')
      .then((d) =>
        setReceipts(
          d.invoices
            .flatMap((i) => i.payments.filter((p) => p.status === 'VERIFIED').map((p) => ({ ...p, invoiceDescription: i.description, term: i.term?.name ?? null })))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      )
      .catch((err) => setError(errorMessage(err)))
  }, [])

  function print(r: Receipt) {
    setSelected(r)
    setTimeout(() => window.print(), 50)
  }

  return (
    <section>
      <div className="no-print">
        <PageHeader eyebrow="Financials" title="Receipts" subtitle="Payments the finance office has verified. Print any of them as a receipt." />
        <ErrorNotice error={error} />
        <Panel>
          <table className="data-table dark-head">
            <thead>
              <tr>
                <th>Receipt no.</th>
                <th>Date</th>
                <th>For</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Amount</th>
                <th aria-label="Print" />
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="mono">RC-{r.id.slice(0, 8).toUpperCase()}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>
                    {r.invoiceDescription}
                    {r.term && <small className="muted block">{r.term}</small>}
                  </td>
                  <td>{METHOD[r.method]}</td>
                  <td className="mono">{r.reference}</td>
                  <td>
                    <strong>{money(r.amount)}</strong>
                  </td>
                  <td>
                    <button type="button" className="secondary small-button" onClick={() => print(r)}>
                      <Printer size={14} /> Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {receipts.length === 0 && <EmptyState title="No verified payments yet" text="Payments appear here once Finance verifies them." />}
        </Panel>
      </div>
      {selected && (
        <article className="document printable print-only receipt">
          <header className="document-head">
            <div className="brand dark">
              <span className="brand-mark">
                <span>SS</span>
              </span>
              <span className="brand-text">
                <strong>STUDENT</strong>
                <small>SERVICES PORTAL</small>
              </span>
            </div>
            <div className="document-title">
              <strong>PAYMENT RECEIPT</strong>
              <span className="mono">RC-{selected.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </header>
          <dl className="details">
            <div>
              <dt>Received from</dt>
              <dd>{user?.fullName}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(selected.createdAt, true)}</dd>
            </div>
            <div>
              <dt>For</dt>
              <dd>{selected.invoiceDescription}</dd>
            </div>
            <div>
              <dt>Method and reference</dt>
              <dd>
                {METHOD[selected.method]} · {selected.reference}
              </dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="receipt-amount">{money(selected.amount)}</dd>
            </div>
          </dl>
          <footer className="document-foot">
            <span>Verified by the finance office.</span>
          </footer>
        </article>
      )}
    </section>
  )
}
