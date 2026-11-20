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
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const P = Permission;

/** Role to permission map for the first release. Later modules (courses, grades, fees, requests) add their own entries. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.STUDENT]: [P.ViewStructure],
  [Role.LECTURER]: [P.ViewStructure],
  [Role.HEAD_OF_DEPARTMENT]: [P.ViewStructure, P.ViewStudents],
  [Role.DEAN]: [P.ViewStructure, P.ViewStudents],
  [Role.ADMISSIONS_OFFICER]: [
    P.ViewStructure,
    P.ViewStudents,
    P.RegisterStudents,
  ],
  [Role.REGISTRAR]: [
    P.ViewStructure,
    P.ManageStructure,
    P.ViewStudents,
    P.RegisterStudents,
    P.UpdateStudents,
    P.ChangeStudentStatus,
  ],
  [Role.FINANCE_OFFICER]: [P.ViewStructure, P.ViewStudents],
  [Role.STUDENT_SERVICES_OFFICER]: [P.ViewStructure, P.ViewStudents],
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
