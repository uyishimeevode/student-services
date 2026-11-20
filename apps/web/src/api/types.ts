export type Role =
  | 'STUDENT'
  | 'LECTURER'
  | 'HEAD_OF_DEPARTMENT'
  | 'DEAN'
  | 'ADMISSIONS_OFFICER'
  | 'REGISTRAR'
  | 'FINANCE_OFFICER'
  | 'STUDENT_SERVICES_OFFICER'
  | 'SYSTEM_ADMINISTRATOR'

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  LECTURER: 'Lecturer',
  HEAD_OF_DEPARTMENT: 'Head of Department',
  DEAN: 'Dean',
  ADMISSIONS_OFFICER: 'Admissions Officer',
  REGISTRAR: 'Registrar',
  FINANCE_OFFICER: 'Finance Officer',
  STUDENT_SERVICES_OFFICER: 'Student Services Officer',
  SYSTEM_ADMINISTRATOR: 'System Administrator',
}

export type Permission =
  | 'users.manage'
  | 'audit.view'
  | 'structure.manage'
  | 'structure.view'
  | 'students.register'
  | 'students.view'
  | 'students.update'
  | 'students.status'

export interface Profile {
  id: string
  email: string
  fullName: string
  role: Role
  isActive: boolean
  mustChangePassword: boolean
  departmentId: string | null
  facultyId: string | null
  permissions: Permission[]
}

export type StudentStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'GRADUATED'
export type Gender = 'MALE' | 'FEMALE'

export interface Faculty {
  id: string
  code: string
  name: string
}

export interface Department {
  id: string
  code: string
  name: string
  facultyId: string
  faculty?: Faculty
}

export interface Program {
  id: string
  code: string
  name: string
  durationYears: number
  departmentId: string
  department?: { id: string; code: string; name: string; facultyId: string }
}

export interface Student {
  id: string
  registrationNumber: string | null
  firstName: string
  lastName: string
  gender: Gender
  dateOfBirth: string
  phone: string
  address: string | null
  intakeYear: number
  yearOfStudy: number
  status: StudentStatus
  programId: string
  userId: string
  createdAt: string
  user: { id: string; email: string; isActive: boolean }
  program: {
    id: string
    code: string
    name: string
    durationYears: number
    department: { id: string; code: string; name: string; facultyId: string }
  }
}

export interface UserRecord {
  id: string
  email: string
  fullName: string
  role: Role
  isActive: boolean
  mustChangePassword: boolean
  departmentId: string | null
  facultyId: string | null
  createdAt: string
}

export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: unknown
  createdAt: string
  actor: { id: string; fullName: string; email: string; role: Role } | null
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}
