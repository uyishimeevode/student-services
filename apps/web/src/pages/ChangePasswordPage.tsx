import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice, Field, PageHeader, Panel } from '../components/Field'

export function ChangePasswordPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirm) {
      setError('The new passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } })
      await refresh()
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader eyebrow="Account" title="Change password" subtitle="At least 8 characters, with a letter and a digit." />
      {user?.mustChangePassword && (
        <p className="notice">You signed in with a temporary password. Set your own password to continue.</p>
      )}
      <Panel>
      <form className="form" onSubmit={submit}>
        <ErrorNotice error={error} />
        <Field label="Current password">
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </Field>
        <Field label="New password">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </Field>
        <Field label="Confirm new password">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save password'}
        </button>
      </form>
      </Panel>
    </section>
  )
}
