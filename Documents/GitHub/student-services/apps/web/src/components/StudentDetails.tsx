import type { Student } from '../api/types'

export function StudentDetails({ student }: { student: Student }) {
  const rows: [string, string][] = [
    ['Registration number', student.registrationNumber ?? '-'],
    ['Email', student.user.email],
    ['Gender', student.gender === 'FEMALE' ? 'Female' : 'Male'],
    ['Date of birth', student.dateOfBirth.slice(0, 10)],
    ['Phone', student.phone],
    ['Address', student.address ?? '-'],
    ['Programme', `${student.program.code} - ${student.program.name}`],
    ['Department', student.program.department.name],
    ['Intake year', String(student.intakeYear)],
    ['Year of study', `${student.yearOfStudy} of ${student.program.durationYears}`],
    ['Status', student.status],
  ]
  return (
    <dl className="card details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
