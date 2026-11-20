import type { ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function ErrorNotice({ error }: { error: string | null }) {
  return error ? <p className="notice error">{error}</p> : null
}
