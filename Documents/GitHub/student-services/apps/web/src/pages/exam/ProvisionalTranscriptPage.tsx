import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, errorMessage, formatDate } from '../../api/client'
import type { ProvisionalTranscript } from '../../api/types'
import { EmptyState, ErrorNotice, PageHeader } from '../../components/Field'

export function ProvisionalTranscriptPage() {
  const [data, setData] = useState<ProvisionalTranscript | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<ProvisionalTranscript>('/my/provisional-transcript')
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const s = data?.student

  return (
    <section>
      <div className="no-print">
        <PageHeader
          eyebrow="Examination"
          title="Provisional transcript"
          subtitle="Approved results only. Request an official transcript from Student Services."
          actions={
            data && data.terms.length > 0 && (
              <button type="button" onClick={() => window.print()}>
                <Printer size={18} /> Print transcript
              </button>
            )
          }
        />
        <ErrorNotice error={error} />
      </div>
      {data && s && data.terms.length === 0 && <EmptyState title="No approved results yet" />}
      {data && s && data.terms.length > 0 && (
        <article className="document printable watermark" data-watermark="PROVISIONAL">
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
              <strong>PROVISIONAL TRANSCRIPT</strong>
              <span>Not valid as an official transcript</span>
            </div>
          </header>
          <dl className="details four document-meta">
            <div>
              <dt>Name</dt>
              <dd>
                {s.firstName} {s.lastName}
              </dd>
            </div>
            <div>
              <dt>Registration number</dt>
              <dd>{s.registrationNumber}</dd>
            </div>
            <div>
              <dt>Programme</dt>
              <dd>{s.program.name}</dd>
            </div>
            <div>
              <dt>Faculty</dt>
              <dd>{s.program.department.faculty.name}</dd>
            </div>
          </dl>
          {data.terms.map((t) => (
            <section key={t.id} className="document-term">
              <h3>
                {t.name} <span>GPA {t.gpa?.toFixed(2) ?? '-'}</span>
              </h3>
              <table className="data-table compact document-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Module</th>
                    <th>Credits</th>
                    <th>Score</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {t.results.map((r) => (
                    <tr key={r.code}>
                      <td className="mono">{r.code}</td>
                      <td>{r.title}</td>
                      <td>{r.credits}</td>
                      <td>{r.score ?? '-'}</td>
                      <td>
                        <strong>{r.grade ?? '-'}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          <div className="document-summary">
            <span>
              Cumulative GPA <strong>{data.cumulativeGpa?.toFixed(2) ?? '-'}</strong>
            </span>
            <span>
              Credits earned <strong>{data.creditsEarned}</strong>
            </span>
            <span>Grading: A 80+, B 70+, C 60+, D 50+, F below 50</span>
          </div>
          <footer className="document-foot">
            <span>
              Printed {formatDate(data.issuedAt, true)} · Verification code <strong className="mono">{data.verificationCode}</strong>
            </span>
          </footer>
        </article>
      )}
    </section>
  )
}
