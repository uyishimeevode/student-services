import { Policy } from '@nestjs/authorization';
import { Role } from '../generated/prisma/enums.js';
import type { AuthUser } from './auth-user.js';
import { hasPermission, Permission } from './permissions.js';

/** Where a student record sits in the academic structure, used for scoped access. */
export interface StudentScope {
  userId: string;
  departmentId: string;
  facultyId: string;
}

@Policy()
export class AccessPolicy {
  manageUsers(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.ManageUsers);
  }

  viewAuditLogs(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.ViewAuditLogs);
  }

  viewStructure(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.ViewStructure);
  }

  manageStructure(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.ManageStructure);
  }

  registerStudents(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.RegisterStudents);
  }

  listStudents(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.ViewStudents);
  }

  updateStudents(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.UpdateStudents);
  }

  changeStudentStatus(user: AuthUser | null) {
    return hasPermission(user?.role, Permission.ChangeStudentStatus);
  }

  /** Record check: Heads of Department see their department, Deans their faculty, students themselves. */
  viewStudent(user: AuthUser, student: StudentScope) {
    if (user.role === Role.STUDENT) return student.userId === user.id;
    if (!hasPermission(user.role, Permission.ViewStudents)) return false;
    if (user.role === Role.HEAD_OF_DEPARTMENT)
      return student.departmentId === user.departmentId;
    if (user.role === Role.DEAN) return student.facultyId === user.facultyId;
    return true;
  }
}
