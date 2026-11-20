import { Role } from '../generated/prisma/enums.js';
import type { AuthUser } from '../common/auth-user.js';
import { DashboardService } from './dashboard.service.js';

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

function setup() {
  const prisma = {
    faculty: { count: vi.fn().mockResolvedValue(1) },
    department: { count: vi.fn().mockResolvedValue(2) },
    program: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: 'p1', code: 'BIT', name: 'BSc IT' }]),
    },
    student: {
      groupBy: vi.fn().mockImplementation(({ by }: { by: string[] }) =>
        Promise.resolve(
          by[0] === 'status'
            ? [
                { status: 'ACTIVE', _count: { _all: 8 } },
                { status: 'SUSPENDED', _count: { _all: 2 } },
              ]
            : [{ programId: 'p1', _count: { _all: 10 } }],
        ),
      ),
      count: vi.fn().mockResolvedValue(4),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 's1', registrationNumber: '202600001' }),
    },
    user: {
      groupBy: vi
        .fn()
        .mockResolvedValue([{ role: 'REGISTRAR', _count: { _all: 2 } }]),
      count: vi.fn().mockResolvedValue(1),
    },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const students = {
    scopeFor: vi
      .fn()
      .mockImplementation((u: AuthUser) =>
        u.role === Role.HEAD_OF_DEPARTMENT
          ? { program: { departmentId: u.departmentId } }
          : {},
      ),
  };
  return {
    service: new DashboardService(prisma as never, students as never),
    prisma,
  };
}

describe('DashboardService', () => {
  it('gives the Registrar student totals, programme counts and recent registrations', async () => {
    const { service, prisma } = setup();
    const result = await service.forUser(user(Role.REGISTRAR));

    expect(result.students).toMatchObject({
      total: 10,
      currentIntake: 4,
      byStatus: { ACTIVE: 8, SUSPENDED: 2, WITHDRAWN: 0, GRADUATED: 0 },
      byProgram: [{ programId: 'p1', code: 'BIT', count: 10 }],
      recent: [],
    });
    expect(result.users).toBeUndefined();
    expect(result.recentActivity).toBeUndefined();
    expect(prisma.student.findMany).toHaveBeenCalled();
  });

  it('scopes a Head of Department and leaves out recent registrations', async () => {
    const { service, prisma } = setup();
    const result = await service.forUser(
      user(Role.HEAD_OF_DEPARTMENT, { departmentId: 'dep-it' }),
    );

    expect(prisma.student.groupBy.mock.calls[0][0].where).toEqual({
      program: { departmentId: 'dep-it' },
    });
    expect(result.students?.recent).toBeUndefined();
  });

  it('gives the System Administrator users, activity and structure but no student figures', async () => {
    const { service } = setup();
    const result = await service.forUser(user(Role.SYSTEM_ADMINISTRATOR));

    expect(result.students).toBeUndefined();
    expect(result.users).toMatchObject({
      active: 2,
      inactive: 1,
      activeByRole: { REGISTRAR: 2, DEAN: 0 },
    });
    expect(result.recentActivity).toEqual([]);
    expect(result.structure).toEqual({
      faculties: 1,
      departments: 2,
      programs: 3,
    });
  });

  it('gives a student only their own record and the structure', async () => {
    const { service } = setup();
    const result = await service.forUser(user(Role.STUDENT));

    expect(result.myRecord).toMatchObject({ registrationNumber: '202600001' });
    expect(result.students).toBeUndefined();
    expect(result.users).toBeUndefined();
  });
});
