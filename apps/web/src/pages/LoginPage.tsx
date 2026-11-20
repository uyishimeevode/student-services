import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice, Field } from '../components/Field'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const profile = await signIn(email, password)
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(profile.mustChangePassword ? '/change-password' : from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="brand">
          <span className="brand-mark">
            <span>SS</span>
          </span>
          <span className="brand-text">
            <strong>STUDENT</strong>
            <small>SERVICES PORTAL</small>
          </span>
        </div>
        <div className="auth-pitch">
          <h2>Registration, records, fees and requests in one place.</h2>
          <p>For students, academic staff and student operations teams.</p>
        </div>
        <small className="auth-foot">Team Karisimbi</small>
      </aside>
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">WELCOME BACK</span>
        <h1>Sign in</h1>
        <p className="muted">Use your institutional email and password.</p>
        <ErrorNotice error={error} />
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
