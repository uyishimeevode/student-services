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
  | 'terms.manage'
  | 'courses.manage'
  | 'offerings.manage'
  | 'courses.register'
  | 'teaching'
  | 'grades.approve'
  | 'transcripts.view'
  | 'reports.view'
  | 'finance.manage'
  | 'fees.pay'
  | 'requests.submit'
  | 'requests.manage'
  | 'applications.manage'

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

export interface DashboardData {
  role: Role
  term?: Term | null
  teaching?: {
    classes: { id: string; gradeStatus: GradeStatus; course: { code: string; title: string }; _count: { enrollments: number; sessions: number } }[]
    classCount: number
    studentCount: number
    sessionCount: number
    gradesOutstanding: number
    returned: number
    averageAttendance: number | null
  }
  approvals?: {
    pending: { id: string; course: { code: string; title: string }; lecturer: { fullName: string } | null; _count: { enrollments: number } }[]
    pendingCount: number
    unassigned: number
  }
  finance?: FinanceTotals & {
    collectionRate: number
    pendingCount: number
    pendingPayments: {
      id: string
      amount: number
      method: PaymentMethod
      reference: string
      createdAt: string
      invoice: { student: { firstName: string; lastName: string; registrationNumber: string | null } }
    }[]
  }
  requests?: {
    byStatus: Record<RequestStatus, number>
    unassigned: number
    mine: number
    upcoming: { id: string; subject: string; appointmentAt: string; student: { firstName: string; lastName: string } }[]
    queue: { id: string; type: RequestType; subject: string; status: RequestStatus; createdAt: string; student: { firstName: string; lastName: string } }[]
  }
  admissions?: {
    byStatus: Record<ApplicationStatus, number>
    latest: { id: string; firstName: string; lastName: string; status: ApplicationStatus; createdAt: string; program: { code: string } }[]
  }
  myActivity?: { id: string; action: string; entity: string; createdAt: string }[]
  studentPortal?: { registeredCourses: number; registeredCredits: number; feeBalance: number; openRequests: number } | null
  structure?: { faculties: number; departments: number; programs: number }
  students?: {
    total: number
    currentIntakeYear: number
    currentIntake: number
    byStatus: Record<StudentStatus, number>
    byProgram: { programId: string; code?: string; name?: string; count: number }[]
    atRisk: number
    recent?: {
      id: string
      registrationNumber: string | null
      firstName: string
      lastName: string
      createdAt: string
      program: { code: string }
    }[]
  }
  users?: {
    active: number
    inactive: number
    pendingPasswordChange: number
    activeByRole: Record<Role, number>
  }
  recentActivity?: {
    id: string
    action: string
    entity: string
    createdAt: string
    actor: { fullName: string } | null
  }[]
  myRecord?: {
    id: string
    registrationNumber: string | null
    status: StudentStatus
    yearOfStudy: number
    intakeYear: number
    program: { code: string; name: string; durationYears: number }
  } | null
}

export interface Term {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
  registrationOpen: boolean
}

export interface Course {
  id: string
  code: string
  title: string
  credits: number
  yearLevel: number
  semester: number
  programId: string
  program?: { id: string; code: string; name: string }
}

export type GradeStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED'

export interface Offering {
  id: string
  gradeStatus: GradeStatus
  gradeNote: string | null
  lecturerId: string | null
  course: {
    id: string
    code: string
    title: string
    credits: number
    yearLevel: number
    semester: number
    program: { id: string; code: string; name: string; departmentId: string }
  }
  term: { id: string; name: string; isCurrent: boolean; registrationOpen: boolean }
  lecturer: { id: string; fullName: string; email: string } | null
  _count: { enrollments: number }
}

export interface ModuleRow extends Offering {
  enrollmentId: string
  status: 'BOOKED' | 'REGISTERED'
  registeredAt: string | null
  fee: number
  invoice: { id: string; due: number; paid: number; pending: number; balance: number; status: 'UNPAID' | 'PARTIAL' | 'PAID' } | null
  canDrop: boolean
}

export interface RegistrationHistory {
  termId: string
  term: string
  stage: string
  registeredAt: string
  units: number
  credits: number
  billed: number
  paid: number
  pending: number
  balance: number
  modules: { code: string; title: string; credits: number }[]
}

export interface MyCourses {
  term: (Term & { feePerCredit: number }) | null
  basket: ModuleRow[]
  registered: ModuleRow[]
  available: (Offering & { fee: number })[]
  totalCredits?: number
  history: RegistrationHistory[]
}

export interface DocStudent {
  id: string
  registrationNumber: string | null
  firstName: string
  lastName: string
  gender?: Gender
  dateOfBirth?: string
  yearOfStudy: number
  intakeYear: number
  program: { code: string; name: string; department: { name: string; faculty: { name: string } } }
}

export type IssuedCard =
  | { issued: true; number: string; verificationCode: string; issuedAt: string }
  | { issued: false; reason: string }

export interface ExamDocuments {
  student: DocStudent
  term: { id: string; name: string; startDate: string; endDate: string } | null
  fees: { due: number; paid: number; balance: number; paidPercent: number; catThresholdPercent: number } | null
  modules: { code: string; title: string; credits: number }[]
  cat: IssuedCard | null
  exam: IssuedCard | null
}

export interface ProvisionalTranscript extends Transcript {
  student: DocStudent
  issuedAt: string
  verificationCode: string
}

export interface Transcript {
  terms: {
    id: string
    name: string
    gpa: number | null
    credits: number
    results: { code: string; title: string; credits: number; score: number | null; grade: string | null }[]
  }[]
  cumulativeGpa: number | null
  creditsEarned: number
}

export interface Material {
  id: string
  title: string
  url: string
  createdAt: string
  offering?: { course: { code: string; title: string } }
}

export interface ClassDetail extends Offering {
  canEdit: boolean
  gradesEditable: boolean
  students: {
    enrollmentId: string
    id: string
    firstName: string
    lastName: string
    registrationNumber: string | null
    score: number | null
    grade: string | null
    attendanceRate: number | null
  }[]
  sessions: { id: string; date: string; topic: string | null; present: number; total: number; presentEnrollmentIds: string[] }[]
  materials: Material[]
}

export type PaymentMethod = 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CASH'
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface Payment {
  id: string
  amount: number
  method: PaymentMethod
  reference: string
  status: PaymentStatus
  note: string | null
  createdAt: string
  invoice?: {
    id: string
    description: string
    student: { id: string; firstName: string; lastName: string; registrationNumber: string | null; program: { code: string } }
  }
}

export interface Invoice {
  id: string
  description: string
  amount: number
  waiverAmount: number
  waiverReason: string | null
  dueDate: string
  createdAt: string
  due: number
  paid: number
  pending: number
  balance: number
  status: 'UNPAID' | 'PARTIAL' | 'PAID'
  payments: Payment[]
  term: { id: string; name: string } | null
  student: { id: string; firstName: string; lastName: string; registrationNumber: string | null; program: { code: string } }
}

export interface FinanceTotals {
  billed: number
  waived: number
  collected: number
  pending: number
  outstanding: number
  invoices: number
}

export type RequestType = 'TRANSCRIPT' | 'LETTER' | 'APPOINTMENT' | 'RECORD_CORRECTION' | 'OTHER'
export type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  TRANSCRIPT: 'Transcript',
  LETTER: 'Letter',
  APPOINTMENT: 'Appointment',
  RECORD_CORRECTION: 'Record correction',
  OTHER: 'Other',
}

export interface ServiceRequest {
  id: string
  type: RequestType
  subject: string
  description: string
  status: RequestStatus
  response: string | null
  appointmentAt: string | null
  createdAt: string
  updatedAt: string
  student: { id: string; firstName: string; lastName: string; registrationNumber: string | null; program: { code: string } }
  assignedTo: { id: string; fullName: string } | null
}

export type ApplicationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'OFFERED' | 'REJECTED' | 'ENROLLED'

export interface Application {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: Gender
  dateOfBirth: string
  previousSchool: string
  intakeYear: number
  status: ApplicationStatus
  documentsVerified: boolean
  decisionNote: string | null
  createdAt: string
  program: { id: string; code: string; name: string }
  reviewedBy: { fullName: string } | null
  student: { id: string; registrationNumber: string | null } | null
}

export interface ReportOverview {
  departments: {
    id: string
    code: string
    name: string
    faculty: { name: string }
    programs: number
    courses: number
    students: number
    byStatus: Record<StudentStatus, number>
    averageScore: number | null
    passRate: number | null
    resultsCount: number
    pendingApprovals: number
  }[]
  totals: { students: number; programs: number; courses: number; pendingApprovals: number }
}
