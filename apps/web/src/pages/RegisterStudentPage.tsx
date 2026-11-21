import { ArrowRight } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Gender, Program, Student } from '../api/types'
import { ErrorNotice, Field, PageHeader, Panel, SecretNotice } from '../components/Field'

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
    api<Program[]>('/programs')
      .then(setPrograms)
      .catch((err) => setError(errorMessage(err)))
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const selected = programs.find((p) => p.id === form.programId)

  return (
    <section className="narrow-wide">
      <PageHeader
        eyebrow="Registration"
        title="Register student"
        subtitle="Creates the official record and the student's sign-in account in one step."
      />

      {result && (
        <SecretNotice secret={result.temporaryPassword}>
          <p>
            <strong>
              {result.student.firstName} {result.student.lastName}
            </strong>{' '}
            is registered as <strong>{result.student.registrationNumber}</strong>.{' '}
            <Link to={`/students/${result.student.id}`}>
              Open record <ArrowRight size={14} />
            </Link>
          </p>
          <p>Temporary password for {result.student.user.email}:</p>
        </SecretNotice>
      )}

      <form onSubmit={submit} className="form-stack">
        <ErrorNotice error={error} />

        <Panel eyebrow="Step 1" title="Personal details">
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
        </Panel>

        <Panel eyebrow="Step 2" title="Contact and sign-in">
          <div className="row">
            <Field label="Email" hint="The student signs in with this address.">
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </Field>
            <Field label="Phone" hint="9 to 15 digits, may start with +.">
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+250788000000" required />
            </Field>
          </div>
          <Field label="Address">
            <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Optional" />
          </Field>
        </Panel>

        <Panel eyebrow="Step 3" title="Academic placement">
          <Field label="Programme" hint={selected ? `${selected.durationYears} years · ${selected.department?.name ?? ''}` : undefined}>
            <select value={form.programId} onChange={(e) => set('programId', e.target.value)} required>
              <option value="">Select a programme</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="row">
            <Field label="Intake year">
              <input
                type="number"
                value={form.intakeYear}
                min={2000}
                max={thisYear + 1}
                onChange={(e) => set('intakeYear', Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Year of study">
              <input
                type="number"
                value={form.yearOfStudy}
                min={1}
                max={selected?.durationYears ?? 7}
                onChange={(e) => set('yearOfStudy', Number(e.target.value))}
                required
              />
            </Field>
          </div>
        </Panel>

        <div className="form-actions">
          <Link to="/students" className="button secondary">
            Cancel
          </Link>
          <button type="submit" disabled={busy}>
            {busy ? 'Registering...' : 'Register student'}
          </button>
        </div>
      </form>
    </section>
  )
}
