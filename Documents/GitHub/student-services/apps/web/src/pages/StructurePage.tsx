import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage } from '../api/client'
import type { Department, Faculty, Program } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice, Field } from '../components/Field'

export function StructurePage() {
  const { can } = useAuth()
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [f, d, p] = await Promise.all([
        api<Faculty[]>('/faculties'),
        api<Department[]>('/departments'),
        api<Program[]>('/programs'),
      ])
      setFaculties(f)
      setDepartments(d)
      setPrograms(p)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const manage = can('structure.manage')

  return (
    <section>
      <h1>Academic structure</h1>
      <ErrorNotice error={error} />
      <div className="columns">
        <div>
          <h2>Faculties</h2>
          <ul className="card list">
            {faculties.map((f) => (
              <li key={f.id}>
                <strong>{f.code}</strong> {f.name}
              </li>
            ))}
          </ul>
          {manage && <CreateForm path="/faculties" fields={['code', 'name']} onCreated={load} />}
        </div>
        <div>
          <h2>Departments</h2>
          <ul className="card list">
            {departments.map((d) => (
              <li key={d.id}>
                <strong>{d.code}</strong> {d.name} <span className="muted">({d.faculty?.code})</span>
              </li>
            ))}
          </ul>
          {manage && (
            <CreateForm path="/departments" fields={['code', 'name']} parent={{ key: 'facultyId', label: 'Faculty', options: faculties }} onCreated={load} />
          )}
        </div>
        <div>
          <h2>Programmes</h2>
          <ul className="card list">
            {programs.map((p) => (
              <li key={p.id}>
                <strong>{p.code}</strong> {p.name} <span className="muted">({p.durationYears} yrs, {p.department?.code})</span>
              </li>
            ))}
          </ul>
          {manage && (
            <CreateForm
              path="/programs"
              fields={['code', 'name']}
              withDuration
              parent={{ key: 'departmentId', label: 'Department', options: departments }}
              onCreated={load}
            />
          )}
        </div>
      </div>
    </section>
  )
}

interface CreateFormProps {
  path: string
  fields: ('code' | 'name')[]
  parent?: { key: string; label: string; options: { id: string; code: string; name: string }[] }
  withDuration?: boolean
  onCreated: () => Promise<void>
}

function CreateForm({ path, fields, parent, withDuration, onCreated }: CreateFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const body: Record<string, unknown> = { ...values }
      if (withDuration) body.durationYears = Number(values.durationYears ?? 4)
      await api(path, { method: 'POST', body })
      setValues({})
      await onCreated()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <form className="card form compact" onSubmit={submit}>
      <ErrorNotice error={error} />
      {fields.map((f) => (
        <Field key={f} label={f === 'code' ? 'Code' : 'Name'}>
          <input value={values[f] ?? ''} onChange={(e) => setValues({ ...values, [f]: e.target.value })} required />
        </Field>
      ))}
      {parent && (
        <Field label={parent.label}>
          <select value={values[parent.key] ?? ''} onChange={(e) => setValues({ ...values, [parent.key]: e.target.value })} required>
            <option value="">Select</option>
            {parent.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} - {o.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {withDuration && (
        <Field label="Duration (years)">
          <input type="number" min={1} max={7} value={values.durationYears ?? '4'} onChange={(e) => setValues({ ...values, durationYears: e.target.value })} />
        </Field>
      )}
      <button type="submit">Add</button>
    </form>
  )
}
