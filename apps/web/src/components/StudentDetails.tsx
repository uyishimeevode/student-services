import { CalendarDays, GraduationCap, Mail, Phone } from 'lucide-react'
import { initials } from '../api/client'
import type { Student } from '../api/types'
import { Panel, StatusBadge } from './Field'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** Profile header for a student: avatar, name, registration number, status and contact line. */
export function StudentProfileHeader({ student }: { student: Student }) {
  const name = `${student.firstName} ${student.lastName}`
  return (
    <div className="profile-card">
      <span className="avatar xl">{initials(name)}</span>
      <div className="profile-main">
        <div className="profile-title">
          <h1>{name}</h1>
          <StatusBadge status={student.status} />
        </div>
        <span className="profile-reg">{student.registrationNumber ?? 'Registration number pending'}</span>
        <div className="profile-meta">
          <span>
            <GraduationCap size={16} /> {student.program.code} · {student.program.name}
          </span>
          <span>
            <CalendarDays size={16} /> Year {student.yearOfStudy} of {student.program.durationYears}
          </span>
          <span>
            <Mail size={16} /> {student.user.email}
          </span>
          <span>
            <Phone size={16} /> {student.phone}
          </span>
        </div>
      </div>
    </div>
  )
}

function DetailList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The full record in two panels: personal details and academic placement. */
export function StudentDetails({ student }: { student: Student }) {
  return (
    <div className="detail-panels">
      <Panel eyebrow="Personal" title="Personal details">
        <DetailList
          rows={[
            ['First name', student.firstName],
            ['Last name', student.lastName],
            ['Gender', student.gender === 'FEMALE' ? 'Female' : 'Male'],
            ['Date of birth', formatDate(student.dateOfBirth)],
            ['Phone', student.phone],
            ['Email', student.user.email],
            ['Address', student.address ?? 'Not provided'],
          ]}
        />
      </Panel>
      <Panel eyebrow="Academic" title="Academic placement">
        <DetailList
          rows={[
            ['Registration number', student.registrationNumber ?? 'Pending'],
            ['Programme', `${student.program.code} · ${student.program.name}`],
            ['Department', student.program.department.name],
            ['Intake year', String(student.intakeYear)],
            ['Year of study', `${student.yearOfStudy} of ${student.program.durationYears}`],
            ['Registered on', formatDate(student.createdAt)],
          ]}
        />
      </Panel>
    </div>
  )
}
