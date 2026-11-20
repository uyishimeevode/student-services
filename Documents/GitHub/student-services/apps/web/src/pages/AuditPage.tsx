import { useCallback, useEffect, useState } from 'react'
import { api, query, errorMessage } from '../api/client'
import type { AuditLog, Page } from '../api/types'
import { ErrorNotice } from '../components/Field'

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [entity, setEntity] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (cursor?: string) => {
      try {
        const page = await api<Page<AuditLog>>(`/audit-logs${query({ entity, cursor, limit: 50 })}`)
        setLogs((current) => (cursor ? [...current, ...page.items] : page.items))
        setNextCursor(page.nextCursor)
      } catch (err) {
        setError(errorMessage(err))
      }
    },
    [entity],
  )

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section>
      <h1>Audit log</h1>
      <div className="filters">
        <select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {['user', 'student', 'faculty', 'department', 'program'].map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
      <ErrorNotice error={error} />
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.actor?.fullName ?? 'System'}</td>
              <td>{log.action}</td>
              <td className="muted">
                {log.entity} {log.entityId?.slice(0, 8)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextCursor && (
        <button type="button" className="secondary" onClick={() => void load(nextCursor)}>
          Load more
        </button>
      )}
    </section>
  )
}
