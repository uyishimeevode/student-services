import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Gender, Program, Student } from '../api/types'
import { ErrorNotice, Field } from '../components/Field'

const thisYear = new Date().getFullYear()

const empty = {
  firstName: '',
  lastName: '',
  gender: 'FEMALE' as Gender,
  dateOfBirth: '',
  phone: '',
  address: '',
  email: '',
  programId: '',
  intakeYear: thisYear,
  yearOfStudy: 1,
}

export function RegisterStudentPage() {
  const [form, setForm] = useState(empty)
  const [programs, setPrograms] = useState<Program[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ student: Student; temporaryPassword: string } | null>(null)

  useEffect(() => {
    api<Program[]>('/programs').then(setPrograms).catch((err) => setError(errorMessage(err)))
  }, [])

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = { ...form, address: form.address || undefined }
      setResult(await api<{ student: Student; temporaryPassword: string }>('/students', { method: 'POST', body }))
      setForm(empty)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <h1>Register student</h1>
      {result && (
        <div className="notice success">
          <p>
            Registered{' '}
            <Link to={`/students/${result.student.id}`}>
              {result.student.firstName} {result.student.lastName}
            </Link>{' '}
            with registration number <strong>{result.student.registrationNumber}</strong>.
          </p>
          <p>
            Temporary password for {result.student.user.email}: <code>{result.temporaryPassword}</code>. Give it to the
            student now; it is not shown again. They must change it at first sign-in.
          </p>
        </div>
      )}
      <form className="card form" onSubmit={submit}>
        <ErrorNotice error={error} />
        <div className="row">
          <Field label="First name">
            <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          </Field>
          <Field label="Last name">
            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          </Field>
        </div>
        <div className="row">
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => set('gender', e.target.value as Gender)}>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} required />
          </Field>
        </div>
        <div className="row">
          <Field label="Email (used to sign in)">
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+250788000000" required />
          </Field>
        </div>
        <Field label="Address">
          <input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Programme">
          <select value={form.programId} onChange={(e) => set('programId', e.target.value)} required>
            <option value="">Select a programme</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="row">
          <Field label="Intake year">
            <input type="number" value={form.intakeYear} min={2000} max={thisYear + 1} onChange={(e) => set('intakeYear', Number(e.target.value))} required />
          </Field>
          <Field label="Year of study">
            <input type="number" value={form.yearOfStudy} min={1} max={7} onChange={(e) => set('yearOfStudy', Number(e.target.value))} required />
          </Field>
        </div>
        <button type="submit" disabled={busy}>
          {busy ? 'Registering...' : 'Register student'}
        </button>
      </form>
    </section>
  )
}
