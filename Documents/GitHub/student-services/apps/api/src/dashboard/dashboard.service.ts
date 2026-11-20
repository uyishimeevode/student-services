import { Injectable } from '@nestjs/common';
import { Role, StudentStatus } from '../generated/prisma/enums.js';
import type { AuthUser } from '../common/auth-user.js';
import { hasPermission, Permission } from '../common/permissions.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';

const RECENT_LIMIT = 5;

type StatusCounts = Record<StudentStatus, number>;

function emptyStatusCounts(): StatusCounts {
  return Object.fromEntries(
    Object.values(StudentStatus).map((s) => [s, 0]),
  ) as StatusCounts;
}

/** Figures for the signed-in user's dashboard. Each section is only present when the role may see it. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
  ) {}

  async forUser(user: AuthUser) {
    const [structure, students, users, recentActivity, myRecord] =
      await Promise.all([
        hasPermission(user.role, Permission.ViewStructure)
          ? this.structureCounts()
          : undefined,
        hasPermission(user.role, Permission.ViewStudents)
          ? this.studentFigures(user)
          : undefined,
        hasPermission(user.role, Permission.ManageUsers)
          ? this.userFigures()
          : undefined,
        hasPermission(user.role, Permission.ViewAuditLogs)
          ? this.recentActivity()
          : undefined,
        user.role === Role.STUDENT ? this.myRecord(user) : undefined,
      ]);
    return {
      role: user.role,
      structure,
      students,
      users,
      recentActivity,
      myRecord,
    };
  }

  private async structureCounts() {
    const [faculties, departments, programs] = await Promise.all([
      this.prisma.faculty.count(),
      this.prisma.department.count(),
      this.prisma.program.count(),
    ]);
    return { faculties, departments, programs };
  }

  /** Student totals within the user's scope (department for HoD, faculty for Dean, everyone otherwise). */
  private async studentFigures(user: AuthUser) {
    const where = this.students.scopeFor(user);
    const currentYear = new Date().getUTCFullYear();

    const [statusGroups, programGroups, currentIntake, recent] =
      await Promise.all([
        this.prisma.student.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.student.groupBy({
          by: ['programId'],
          where,
          _count: { _all: true },
        }),
        this.prisma.student.count({
          where: { AND: [where, { intakeYear: currentYear }] },
        }),
        hasPermission(user.role, Permission.RegisterStudents)
          ? this.prisma.student.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              take: RECENT_LIMIT,
              select: {
                id: true,
                registrationNumber: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                program: { select: { code: true } },
              },
            })
          : undefined,
      ]);

    const byStatus = emptyStatusCounts();
    for (const group of statusGroups as {
      status: StudentStatus;
      _count: { _all: number };
    }[]) {
      byStatus[group.status] = group._count._all;
    }
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    const counts = programGroups as {
      programId: string;
      _count: { _all: number };
    }[];
    const programs = counts.length
      ? await this.prisma.program.findMany({
          where: { id: { in: counts.map((g) => g.programId) } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const programById = new Map(
      (programs as { id: string; code: string; name: string }[]).map((p) => [
        p.id,
        p,
      ]),
    );
    const byProgram = counts
      .map((g) => ({
        ...programById.get(g.programId),
        programId: g.programId,
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      currentIntakeYear: currentYear,
      currentIntake,
      byStatus,
      byProgram,
      recent,
    };
  }

  private async userFigures() {
    const [roleGroups, inactive, mustChangePassword] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({
        where: { isActive: true, mustChangePassword: true },
      }),
    ]);
    const activeByRole = Object.fromEntries(
      Object.values(Role).map((r) => [r, 0]),
    ) as Record<Role, number>;
    for (const group of roleGroups as {
      role: Role;
      _count: { _all: number };
    }[]) {
      activeByRole[group.role] = group._count._all;
    }
    const active = Object.values(activeByRole).reduce((sum, n) => sum + n, 0);
    return {
      active,
      inactive,
      pendingPasswordChange: mustChangePassword,
      activeByRole,
    };
  }

  private recentActivity() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: {
        id: true,
        action: true,
        entity: true,
        createdAt: true,
        actor: { select: { fullName: true } },
      },
    });
  }

  private myRecord(user: AuthUser) {
    return this.prisma.student.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        yearOfStudy: true,
        intakeYear: true,
        program: { select: { code: true, name: true, durationYears: true } },
      },
    });
  }
}
