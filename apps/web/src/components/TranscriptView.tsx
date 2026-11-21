import type { Transcript } from '../api/types'
import { Panel } from './Field'

/** Approved results by term with term GPA. */
export function TranscriptView({ transcript }: { transcript: Transcript }) {
  return (
    <div className="stack">
      {transcript.terms.map((t) => (
        <Panel key={t.id} eyebrow={`${t.credits} credits`} title={t.name} actions={<span className="gpa">GPA {t.gpa?.toFixed(2) ?? '-'}</span>}>
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course</th>
                <th>Credits</th>
                <th>Score</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {t.results.map((r) => (
                <tr key={r.code}>
                  <td>
                    <span className="code-chip">{r.code}</span>
                  </td>
                  <td>{r.title}</td>
                  <td>{r.credits}</td>
                  <td>{r.score ?? '-'}</td>
                  <td>
                    <strong className={`grade grade-${(r.grade ?? '').toLowerCase()}`}>{r.grade ?? '-'}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ))}
    </div>
  )
}
