import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, download, errorMessage } from '../../api/client'
import type { ReportOverview } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, ErrorNotice, MiniStat, PageHeader, Panel } from '../../components/Field'

export function ReportsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<ReportOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<ReportOverview>('/reports/overview')
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const scope = user?.role === 'DEAN' ? 'your faculty' : user?.role === 'HEAD_OF_DEPARTMENT' ? 'your department' : 'the institution'

  async function exportCsv() {
    setError(null)
    try {
      await download('/reports/students.csv', 'students.csv')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        subtitle={`Students, programmes and results across ${scope}.`}
        actions={
          <button type="button" onClick={() => void exportCsv()}>
            <Download size={18} /> Export students (CSV)
          </button>
        }
      />
      <ErrorNotice error={error} />
      {data && (
        <>
          <div className="mini-stats">
            <MiniStat label="Students" value={data.totals.students} />
            <MiniStat label="Programmes" value={data.totals.programs} tone="amber" />
            <MiniStat label="Courses" value={data.totals.courses} tone="blue" />
            <MiniStat label="Grades awaiting approval" value={data.totals.pendingApprovals} tone="purple" />
          </div>
          <Panel eyebrow="By department" title="Department performance">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Students</th>
                  <th>Active</th>
                  <th>Suspended or withdrawn</th>
                  <th>Average score</th>
                  <th>Pass rate</th>
                  <th>Pending approvals</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="person">
                        <span className="code-chip">{d.code}</span>
                        <span>
                          <strong>{d.name}</strong>
                          <small>
                            {d.faculty.name} · {d.programs} programmes · {d.courses} courses
                          </small>
                        </span>
                      </span>
                    </td>
                    <td>{d.students}</td>
                    <td>{d.byStatus.ACTIVE}</td>
                    <td>{d.byStatus.SUSPENDED + d.byStatus.WITHDRAWN}</td>
                    <td>{d.averageScore ?? '-'}</td>
                    <td>
                      {d.passRate === null ? (
                        '-'
                      ) : (
                        <span className="bar">
                          <span style={{ width: `${d.passRate}%` }} />
                          <em>{d.passRate}%</em>
                        </span>
                      )}
                    </td>
                    <td>{d.pendingApprovals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.departments.length === 0 && <EmptyState title="No departments in your scope" />}
          </Panel>
        </>
      )}
    </section>
  )
}
