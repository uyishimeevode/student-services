import type { LucideIcon } from 'lucide-react'
import { BookOpen, Building2, Layers, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api, errorMessage } from '../api/client'
import type { Department, Faculty, Program } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorNotice, Field, PageHeader } from '../components/Field'

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

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
      <PageHeader
        eyebrow="Academics"
        title="Academic structure"
        subtitle="Faculties contain departments, and departments offer programmes."
      />
      <ErrorNotice error={error} />

      <div className="structure-grid">
        <StructureColumn
          icon={Building2}
          tone="green"
          title="Faculties"
          count={faculties.length}
          form={manage && <CreateForm path="/faculties" label="faculty" onCreated={load} />}
        >
          {faculties.map((f) => (
            <StructureItem
              key={f.id}
              code={f.code}
              name={f.name}
              meta={plural(departments.filter((d) => d.facultyId === f.id).length, 'department')}
            />
          ))}
        </StructureColumn>

        <StructureColumn
          icon={Layers}
          tone="amber"
          title="Departments"
          count={departments.length}
          form={
            manage && (
              <CreateForm
                path="/departments"
                label="department"
                parent={{ key: 'facultyId', label: 'Faculty', options: faculties }}
                onCreated={load}
              />
            )
          }
        >
          {departments.map((d) => (
            <StructureItem key={d.id} code={d.code} name={d.name} meta={d.faculty?.name ?? ''} />
          ))}
        </StructureColumn>

        <StructureColumn
          icon={BookOpen}
          tone="blue"
          title="Programmes"
          count={programs.length}
          form={
            manage && (
              <CreateForm
                path="/programs"
                label="programme"
                withDuration
                parent={{ key: 'departmentId', label: 'Department', options: departments }}
                onCreated={load}
              />
            )
          }
        >
          {programs.map((p) => (
            <StructureItem
              key={p.id}
              code={p.code}
              name={p.name}
              meta={`${p.durationYears} years · ${p.department?.name ?? ''}`}
            />
          ))}
        </StructureColumn>
      </div>
    </section>
  )
}

function StructureColumn({
  icon: Icon,
  tone,
  title,
  count,
  form,
  children,
}: {
  icon: LucideIcon
  tone: string
  title: string
  count: number
  form: ReactNode
  children: ReactNode
}) {
  return (
    <section className="panel structure-column">
      <div className="structure-head">
        <span className={`stat-icon tone-${tone}`}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <div>
          <span className="eyebrow">{title.toUpperCase()}</span>
          <strong className="structure-count">{count}</strong>
        </div>
      </div>
      <ul className="structure-list">{children}</ul>
      {count === 0 && <EmptyState title={`No ${title.toLowerCase()} yet`} />}
      {form}
    </section>
  )
}

function StructureItem({ code, name, meta }: { code: string; name: string; meta: string }) {
  return (
    <li>
      <span className="code-chip">{code}</span>
      <span className="structure-text">
        <strong>{name}</strong>
        <small>{meta}</small>
      </span>
    </li>
  )
}

interface CreateFormProps {
  path: string
  label: string
  parent?: { key: string; label: string; options: { id: string; code: string; name: string }[] }
  withDuration?: boolean
  onCreated: () => Promise<void>
}

function CreateForm({ path, label, parent, withDuration, onCreated }: CreateFormProps) {
  const [open, setOpen] = useState(false)
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
      setOpen(false)
      await onCreated()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!open) {
    return (
      <button type="button" className="secondary add-button" onClick={() => setOpen(true)}>
        <Plus size={16} /> Add {label}
      </button>
    )
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <div className="inline-form-head">
        <strong>New {label}</strong>
        <button type="button" className="icon-only" aria-label="Close" onClick={() => setOpen(false)}>
          <X size={16} />
        </button>
      </div>
      <ErrorNotice error={error} />
      <Field label="Code" hint="2 to 12 letters or digits, e.g. FCIT">
        <input value={values.code ?? ''} onChange={(e) => setValues({ ...values, code: e.target.value })} required />
      </Field>
      <Field label="Name">
        <input value={values.name ?? ''} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
      </Field>
      {parent && (
        <Field label={parent.label}>
          <select
            value={values[parent.key] ?? ''}
            onChange={(e) => setValues({ ...values, [parent.key]: e.target.value })}
            required
          >
            <option value="">Select</option>
            {parent.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} · {o.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {withDuration && (
        <Field label="Duration (years)">
          <input
            type="number"
            min={1}
            max={7}
            value={values.durationYears ?? '4'}
            onChange={(e) => setValues({ ...values, durationYears: e.target.value })}
          />
        </Field>
      )}
      <button type="submit">Save {label}</button>
    </form>
  )
}
