import { Lock, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, formatDate, initials, money } from '../../api/client'
import type { ExamDocuments } from '../../api/types'
import { ErrorNotice, PageHeader } from '../../components/Field'

const TITLES = { cat: 'CAT card', exam: 'Examination card' } as const

/** CAT card or exam card for the current term. The API only issues a card once fees allow it. */
export function ExamCardPage({ type }: { type: 'cat' | 'exam' }) {
  const [data, setData] = useState<ExamDocuments | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<ExamDocuments>('/my/exam-documents')
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const card = data?.[type]
  const s = data?.student
  const name = s ? `${s.firstName} ${s.lastName}` : ''

  return (
    <section>
      <div className="no-print">
        <PageHeader
          eyebrow="Examination"
          title={TITLES[type]}
          subtitle={
            type === 'cat'
              ? `Issued once at least ${data?.fees?.catThresholdPercent ?? 50}% of this term's fees are paid and verified.`
              : "Issued once this term's fee balance is cleared."
          }
          actions={
            card?.issued && (
              <button type="button" onClick={() => window.print()}>
                <Printer size={18} /> Print card
              </button>
            )
          }
        />
        <ErrorNotice error={error} />
      </div>

      {data && !data.term && <p className="notice">No term is open.</p>}

      {data?.fees && card && !card.issued && (
        <div className="panel locked">
          <Lock size={36} />
          <h2>Your {TITLES[type].toLowerCase()} is not available yet</h2>
          <p className="muted">{card.reason}.</p>
          <div className="fee-progress">
            <span style={{ width: `${Math.min(data.fees.paidPercent, 100)}%` }} />
          </div>
          <p className="muted small">
            Paid {money(data.fees.paid)} of {money(data.fees.due)} ({data.fees.paidPercent}%) · Balance {money(data.fees.balance)}
          </p>
          <Link to="/my/fees" className="button">
            Go to fee statement
          </Link>
        </div>
      )}

      {data?.term && s && card?.issued && (
        <article className="document printable">
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
              <strong>{TITLES[type].toUpperCase()}</strong>
              <span>{data.term.name}</span>
            </div>
          </header>
          <div className="document-student">
            <span className="avatar photo">{initials(name)}</span>
            <dl className="details">
              <div>
                <dt>Name</dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt>Registration number</dt>
                <dd>{s.registrationNumber}</dd>
              </div>
              <div>
                <dt>Programme</dt>
                <dd>
                  {s.program.code} · {s.program.name}
                </dd>
              </div>
              <div>
                <dt>Faculty</dt>
                <dd>{s.program.department.faculty.name}</dd>
              </div>
              <div>
                <dt>Year of study</dt>
                <dd>{s.yearOfStudy}</dd>
              </div>
              <div>
                <dt>Card number</dt>
                <dd className="mono">{card.number}</dd>
              </div>
            </dl>
          </div>
          <table className="data-table compact document-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Module code</th>
                <th>Module</th>
                <th>Credits</th>
                <th>Invigilator signature</th>
              </tr>
            </thead>
            <tbody>
              {data.modules.map((m, i) => (
                <tr key={m.code}>
                  <td>{i + 1}</td>
                  <td className="mono">{m.code}</td>
                  <td>{m.title}</td>
                  <td>{m.credits}</td>
                  <td className="signature" />
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="document-foot">
            <span>
              Issued {formatDate(card.issuedAt, true)} · Verification code <strong className="mono">{card.verificationCode}</strong>
            </span>
            <span>Bring this card and your student ID to every {type === 'cat' ? 'CAT' : 'examination'}.</span>
          </footer>
        </article>
      )}
    </section>
  )
}
