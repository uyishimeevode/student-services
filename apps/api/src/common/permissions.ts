import { Role } from '../generated/prisma/enums.js';

export const Permission = {
  ManageUsers: 'users.manage',
  ViewAuditLogs: 'audit.view',
  ManageStructure: 'structure.manage',
  ViewStructure: 'structure.view',
  RegisterStudents: 'students.register',
  ViewStudents: 'students.view',
  UpdateStudents: 'students.update',
  ChangeStudentStatus: 'students.status',
  ManageTerms: 'terms.manage',
  ManageCourses: 'courses.manage',
  ManageOfferings: 'offerings.manage',
  RegisterCourses: 'courses.register',
  Teach: 'teaching',
  ApproveGrades: 'grades.approve',
  ViewTranscripts: 'transcripts.view',
  ViewReports: 'reports.view',
  ManageFinance: 'finance.manage',
  PayFees: 'fees.pay',
  SubmitRequests: 'requests.submit',
  ManageRequests: 'requests.manage',
  ManageApplications: 'applications.manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const P = Permission;

/** Role to permission map for the first release. Later modules (courses, grades, fees, requests) add their own entries. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.STUDENT]: [P.RegisterCourses, P.PayFees, P.SubmitRequests],
  [Role.LECTURER]: [P.ViewStructure, P.Teach],
  [Role.HEAD_OF_DEPARTMENT]: [
    P.ViewStructure,
    P.ViewStudents,
    P.ManageCourses,
    P.ManageOfferings,
    P.Teach,
    P.ApproveGrades,
    P.ViewReports,
  ],
  [Role.DEAN]: [P.ViewStructure, P.ViewStudents, P.ViewReports],
  [Role.ADMISSIONS_OFFICER]: [
    P.ViewStructure,
    P.ViewStudents,
    P.RegisterStudents,
    P.ManageApplications,
  ],
  [Role.REGISTRAR]: [
    P.ViewStructure,
    P.ManageStructure,
    P.ViewStudents,
    P.RegisterStudents,
    P.UpdateStudents,
    P.ChangeStudentStatus,
    P.ManageTerms,
    P.ManageCourses,
    P.ManageOfferings,
    P.ViewTranscripts,
    P.ViewReports,
    P.ManageRequests,
  ],
  [Role.FINANCE_OFFICER]: [P.ViewStructure, P.ViewStudents, P.ManageFinance],
  [Role.STUDENT_SERVICES_OFFICER]: [
    P.ViewStructure,
    P.ViewStudents,
    P.ManageRequests,
    P.ViewTranscripts,
  ],
  [Role.SYSTEM_ADMINISTRATOR]: [
    P.ViewStructure,
    P.ManageStructure,
    P.ManageUsers,
    P.ViewAuditLogs,
  ],
};

export function hasPermission(
  role: Role | undefined,
  permission: Permission,
): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
