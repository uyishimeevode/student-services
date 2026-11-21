import { Check, Copy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { StudentStatus } from '../api/types'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  )
}

export function ErrorNotice({ error }: { error: string | null }) {
  return error ? <p className="notice error">{error}</p> : null
}

/** Eyebrow, title and subtitle at the top of every page, with optional actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow.toUpperCase()}</span>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

/** A bordered section with an eyebrow and title, like the dashboard panels. */
export function Panel({
  eyebrow,
  title,
  actions,
  children,
  className = '',
}: {
  eyebrow?: string
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      {(eyebrow || title || actions) && (
        <div className="panel-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow.toUpperCase()}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {text && <span className="muted">{text}</span>}
    </div>
  )
}

const STATUS_LABEL: Record<StudentStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  WITHDRAWN: 'Withdrawn',
  GRADUATED: 'Graduated',
}

export function StatusBadge({ status }: { status: StudentStatus }) {
  return <span className={`badge ${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
}

/** Shows a one-time temporary password with a copy button. */
export function SecretNotice({ children, secret }: { children: ReactNode; secret: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="notice success secret">
      <div className="secret-text">{children}</div>
      <div className="secret-value">
        <code>{secret}</code>
        <button type="button" className="secondary icon-button" onClick={() => void copy()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <small>Shown once. Share it with the account owner now; they must change it at first sign-in.</small>
    </div>
  )
}

/** Simple tab strip; the parent owns which tab is active. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[]
  active: T
  onChange: (value: T) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={active === t.value}
          className={`tab ${active === t.value ? 'selected' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Small stat tile used at the top of module pages. */
export function MiniStat({ label, value, tone = 'green' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className={`mini-stat tone-border-${tone}`}>
      <small>{label.toUpperCase()}</small>
      <strong>{value}</strong>
    </div>
  )
}

const TONE_BY_STATUS: Record<string, string> = {
  OPEN: 'suspended',
  IN_PROGRESS: 'graduated',
  RESOLVED: 'active',
  REJECTED: 'withdrawn',
  SUBMITTED: 'suspended',
  UNDER_REVIEW: 'graduated',
  OFFERED: 'active',
  ENROLLED: 'active',
  PENDING: 'suspended',
  VERIFIED: 'active',
  DRAFT: 'neutral',
  APPROVED: 'active',
  RETURNED: 'withdrawn',
  UNPAID: 'withdrawn',
  PARTIAL: 'suspended',
  PAID: 'active',
}

/** Badge for any workflow status; underscores become spaces. */
export function StateBadge({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
  return <span className={`badge ${TONE_BY_STATUS[status] ?? 'neutral'}`}>{label}</span>
}
