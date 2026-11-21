import { Check, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { ROLE_LABELS, type Permission, type Role } from '../api/types'
import { ErrorNotice, PageHeader, Panel } from '../components/Field'

const PERMISSION_LABELS: Record<Permission, string> = {
  'users.manage': 'Manage users and roles',
  'audit.view': 'View audit logs',
  'structure.manage': 'Manage faculties, departments, programmes',
  'structure.view': 'View academic structure',
  'students.register': 'Register students',
  'students.view': 'View student records',
  'students.update': 'Edit student records',
  'students.status': 'Change student status',
  'terms.manage': 'Manage terms and registration window',
  'courses.manage': 'Manage course catalogue',
  'offerings.manage': 'Run classes and assign lecturers',
  'courses.register': 'Register modules (own)',
  teaching: 'Teach classes: attendance, grades, materials',
  'grades.approve': 'Approve grades',
  'transcripts.view': 'View transcripts',
  'reports.view': 'View reports',
  'finance.manage': 'Invoices, payments and waivers',
  'fees.pay': 'Pay fees (own)',
  'requests.submit': 'Submit requests (own)',
  'requests.manage': 'Handle service requests',
  'applications.manage': 'Handle admissions',
}

const GROUPS: { title: string; roles: Role[] }[] = [
  { title: 'Student Access', roles: ['STUDENT'] },
  { title: 'Academic Delivery', roles: ['LECTURER', 'HEAD_OF_DEPARTMENT', 'DEAN'] },
  { title: 'Student Operations', roles: ['ADMISSIONS_OFFICER', 'REGISTRAR', 'FINANCE_OFFICER', 'STUDENT_SERVICES_OFFICER'] },
  { title: 'System Control', roles: ['SYSTEM_ADMINISTRATOR'] },
]

const ORDER = GROUPS.flatMap((g) => g.roles)

/** Read-only matrix of what each role may do. Roles are assigned to people on the Users page. */
export function RolesPage() {
  const [matrix, setMatrix] = useState<Record<string, Permission[]>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ role: Role; permissions: Permission[] }[]>('/users/roles')
      .then((rows) => setMatrix(Object.fromEntries(rows.map((r) => [r.role, r.permissions]))))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <section>
      <PageHeader
        eyebrow="System control"
        title="Roles and permissions"
        subtitle="Nine roles in four access groups. Assign a role to a person on the Users and Access page."
      />
      <ErrorNotice error={error} />
      <Panel>
        <div className="table-scroll">
          <table className="data-table matrix">
            <thead>
              <tr>
                <th>Permission</th>
                {ORDER.map((r) => (
                  <th key={r}>{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PERMISSION_LABELS) as Permission[]).map((p) => (
                <tr key={p}>
                  <td>{PERMISSION_LABELS[p]}</td>
                  {ORDER.map((r) => (
                    <td key={r} className="center">
                      {matrix[r]?.includes(p) ? <Check size={16} className="yes" /> : <Minus size={14} className="no" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  )
}
