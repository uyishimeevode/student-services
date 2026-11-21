import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, initials, query } from '../api/client'
import { ROLE_LABELS, type AuditLog, type Page } from '../api/types'
import { EmptyState, ErrorNotice, PageHeader, Panel } from '../components/Field'

const ENTITIES = [
  { value: '', label: 'All' },
  { value: 'student', label: 'Students' },
  { value: 'user', label: 'Users' },
  { value: 'faculty', label: 'Faculties' },
  { value: 'department', label: 'Departments' },
  { value: 'program', label: 'Programmes' },
]

const ACTION_LABELS: Record<string, string> = {
  'auth.sign_in': 'Signed in',
  'auth.change_password': 'Changed password',
  'user.create': 'Created account',
  'user.update': 'Updated account',
  'user.reset_password': 'Reset password',
  'student.register': 'Registered student',
  'student.update': 'Updated student record',
  'student.change_status': 'Changed student status',
  'faculty.create': 'Added faculty',
  'department.create': 'Added department',
  'program.create': 'Added programme',
}

function describe(log: AuditLog): string {
  const details = log.details as Record<string, unknown> | null
  if (log.action === 'student.change_status' && details) return `${details.from} to ${details.to}: ${details.reason}`
  if (log.action === 'student.register' && details?.registrationNumber) return String(details.registrationNumber)
  if (log.action === 'user.create' && details?.role) return ROLE_LABELS[details.role as keyof typeof ROLE_LABELS] ?? ''
  return log.entityId ? `${log.entity} ${log.entityId.slice(0, 8)}` : log.entity
}

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
      <PageHeader eyebrow="System control" title="Audit log" subtitle="Every sign-in and change, newest first." />
      <ErrorNotice error={error} />
      <Panel>
        <div className="chips">
          {ENTITIES.map((e) => (
            <button
              key={e.value}
              type="button"
              className={`chip ${entity === e.value ? 'selected' : ''}`}
              onClick={() => setEntity(e.value)}
            >
              {e.label}
            </button>
          ))}
        </div>
        <ol className="timeline">
          {logs.map((log) => (
            <li key={log.id}>
              <span className="avatar">{initials(log.actor?.fullName ?? 'System')}</span>
              <span className="timeline-body">
                <strong>
                  {log.actor?.fullName ?? 'System'} <span className="muted">·</span>{' '}
                  {ACTION_LABELS[log.action] ?? log.action}
                </strong>
                <small>{describe(log)}</small>
              </span>
              <span className="badge graduated">{log.entity}</span>
              <time className="muted small">{new Date(log.createdAt).toLocaleString()}</time>
            </li>
          ))}
        </ol>
        {logs.length === 0 && <EmptyState title="No activity recorded" />}
        {nextCursor && (
          <div className="load-more">
            <button type="button" className="secondary" onClick={() => void load(nextCursor)}>
              Load more
            </button>
          </div>
        )}
      </Panel>
    </section>
  )
}
