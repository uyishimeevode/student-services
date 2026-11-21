import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Gender } from '../api/types'
import { ErrorNotice, Field } from '../components/Field'

interface PublicProgram {
  id: string
  code: string
  name: string
  durationYears: number
  department: { name: string }
}

const year = new Date().getFullYear()

export function ApplyPage() {
  const [programs, setPrograms] = useState<PublicProgram[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'FEMALE' as Gender,
    dateOfBirth: '',
    previousSchool: '',
    programId: '',
    intakeYear: year + 1,
  })

  useEffect(() => {
    api<PublicProgram[]>('/public/programs')
      .then(setPrograms)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<{ reference: string }>('/public/applications', { method: 'POST', body: form })
      setReference(res.reference)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="public-page">
      <header className="public-head">
        <div className="brand">
          <span className="brand-mark">
            <span>SS</span>
          </span>
          <span className="brand-text">
            <strong>STUDENT</strong>
            <small>SERVICES PORTAL</small>
          </span>
        </div>
        <Link to="/login" className="public-link">
          Already a student? Sign in
        </Link>
      </header>
      <main className="public-main">
        {reference ? (
          <div className="panel center-panel">
            <CheckCircle2 size={44} className="success-icon" />
            <h1>Application received</h1>
            <p className="muted">
              Your reference is <strong>{reference}</strong>. The admissions office will review your documents and contact you at {form.email}.
            </p>
          </div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <div>
              <span className="eyebrow">ADMISSIONS {form.intakeYear}</span>
              <h1 className="page-title">Apply for admission</h1>
              <p className="muted">Fill in your details. Bring your certificates and national ID when the admissions office contacts you.</p>
            </div>
            <ErrorNotice error={error} />
            <div className="panel form">
              <h2>About you</h2>
              <div className="row">
                <Field label="First name">
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                </Field>
                <Field label="Last name">
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </Field>
              </div>
              <div className="row">
                <Field label="Gender">
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                </Field>
                <Field label="Date of birth">
                  <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} required />
                </Field>
              </div>
              <div className="row">
                <Field label="Email">
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250788000000" required />
                </Field>
              </div>
            </div>
            <div className="panel form">
              <h2>Your studies</h2>
              <Field label="Previous school">
                <input value={form.previousSchool} onChange={(e) => setForm({ ...form, previousSchool: e.target.value })} required />
              </Field>
              <div className="row">
                <Field label="Programme">
                  <select value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })} required>
                    <option value="">Select a programme</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.durationYears} years)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Intake year">
                  <select value={form.intakeYear} onChange={(e) => setForm({ ...form, intakeYear: Number(e.target.value) })}>
                    <option value={year}>{year}</option>
                    <option value={year + 1}>{year + 1}</option>
                  </select>
                </Field>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Submitting...' : 'Submit application'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
