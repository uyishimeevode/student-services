import { Role } from '../generated/prisma/enums.js';
import { AccessPolicy } from './access.policy.js';
import type { AuthUser } from './auth-user.js';

function user(role: Role, extra: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    email: 'u1@test.local',
    fullName: 'Test User',
    role,
    isActive: true,
    mustChangePassword: false,
    departmentId: null,
    facultyId: null,
    ...extra,
  };
}

const record = {
  userId: 'student-user',
  departmentId: 'dep-it',
  facultyId: 'fac-cit',
};

describe('AccessPolicy', () => {
  const policy = new AccessPolicy();

  it('lets only the System Administrator manage users and read audit logs', () => {
    for (const role of Object.values(Role)) {
      expect(policy.manageUsers(user(role))).toBe(
        role === Role.SYSTEM_ADMINISTRATOR,
      );
      expect(policy.viewAuditLogs(user(role))).toBe(
        role === Role.SYSTEM_ADMINISTRATOR,
      );
    }
  });

  it('lets the Registrar and Admissions Officer register students', () => {
    const allowed = Object.values(Role).filter((role) =>
      policy.registerStudents(user(role)),
    );
    expect(allowed.sort()).toEqual(
      [Role.ADMISSIONS_OFFICER, Role.REGISTRAR].sort(),
    );
  });

  it('lets only the Registrar change a student status', () => {
    const allowed = Object.values(Role).filter((role) =>
      policy.changeStudentStatus(user(role)),
    );
    expect(allowed).toEqual([Role.REGISTRAR]);
  });

  it('denies a guest everything', () => {
    expect(policy.viewStructure(null)).toBe(false);
    expect(policy.listStudents(null)).toBe(false);
  });

  it('scopes a Head of Department to their department', () => {
    expect(
      policy.viewStudent(
        user(Role.HEAD_OF_DEPARTMENT, { departmentId: 'dep-it' }),
        record,
      ),
    ).toBe(true);
    expect(
      policy.viewStudent(
        user(Role.HEAD_OF_DEPARTMENT, { departmentId: 'dep-bus' }),
        record,
      ),
    ).toBe(false);
  });

  it('scopes a Dean to their faculty', () => {
    expect(
      policy.viewStudent(user(Role.DEAN, { facultyId: 'fac-cit' }), record),
    ).toBe(true);
    expect(
      policy.viewStudent(user(Role.DEAN, { facultyId: 'fac-bus' }), record),
    ).toBe(false);
  });

  it('lets a student see only their own record', () => {
    expect(
      policy.viewStudent(user(Role.STUDENT, { id: 'student-user' }), record),
    ).toBe(true);
    expect(
      policy.viewStudent(user(Role.STUDENT, { id: 'someone-else' }), record),
    ).toBe(false);
  });

  it('keeps lecturers and system administrators out of student records', () => {
    expect(policy.viewStudent(user(Role.LECTURER), record)).toBe(false);
    expect(policy.viewStudent(user(Role.SYSTEM_ADMINISTRATOR), record)).toBe(
      false,
    );
  });
});
