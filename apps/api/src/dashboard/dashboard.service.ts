import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  EnrollmentStatus,
  GradeStatus,
  PaymentStatus,
  RequestStatus,
  Role,
  StudentStatus,
} from '../generated/prisma/enums.js';
import { PASS_MARK } from '../courses/grading.js';
import { FinanceService, invoiceTotals } from '../finance/finance.service.js';
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
    private readonly finance: FinanceService,
  ) {}

  async forUser(user: AuthUser) {
    const can = (p: Permission) => hasPermission(user.role, p);
    const [
      term,
      structure,
      students,
      users,
      recentActivity,
      myRecord,
      teaching,
      approvals,
      finance,
      requests,
      admissions,
      studentPortal,
    ] = await Promise.all([
      this.prisma.academicTerm.findFirst({ where: { isCurrent: true } }),
      can(Permission.ViewStructure) ? this.structureCounts() : undefined,
      can(Permission.ViewStudents) ? this.studentFigures(user) : undefined,
      can(Permission.ManageUsers) ? this.userFigures() : undefined,
      can(Permission.ViewAuditLogs) ? this.recentActivity() : undefined,
      user.role === Role.STUDENT ? this.myRecord(user) : undefined,
      can(Permission.Teach) ? this.teachingFigures(user) : undefined,
      can(Permission.ApproveGrades) ? this.approvalFigures(user) : undefined,
      can(Permission.ManageFinance) ? this.financeFigures() : undefined,
      can(Permission.ManageRequests) ? this.requestFigures(user) : undefined,
      can(Permission.ManageApplications) ? this.admissionFigures() : undefined,
      user.role === Role.STUDENT ? this.studentPortalFigures(user) : undefined,
    ]);
    const myActivity = await this.prisma.auditLog.findMany({
      where: { actorId: user.id, NOT: { action: 'auth.sign_in' } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: { id: true, action: true, entity: true, createdAt: true },
    });
    return {
      role: user.role,
      term,
      structure,
      students,
      users,
      recentActivity,
      myRecord,
      teaching,
      approvals,
      finance,
      requests,
      admissions,
      studentPortal,
      myActivity,
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
      atRisk: await this.atRisk(where),
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

  private async teachingFigures(user: AuthUser) {
    const classes = await this.prisma.courseOffering.findMany({
      where: { lecturerId: user.id, term: { isCurrent: true } },
      orderBy: { course: { code: 'asc' } },
      select: {
        id: true,
        gradeStatus: true,
        course: { select: { code: true, title: true } },
        _count: {
          select: {
            enrollments: { where: { status: EnrollmentStatus.REGISTERED } },
            sessions: true,
          },
        },
      },
    });
    const open: GradeStatus[] = [GradeStatus.DRAFT, GradeStatus.RETURNED];
    const inMyClasses = {
      session: { offering: { lecturerId: user.id, term: { isCurrent: true } } },
    };
    const [records, present] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: inMyClasses }),
      this.prisma.attendanceRecord.count({
        where: { ...inMyClasses, present: true },
      }),
    ]);
    return {
      classes,
      classCount: classes.length,
      studentCount: classes.reduce((s, c) => s + c._count.enrollments, 0),
      sessionCount: classes.reduce((s, c) => s + c._count.sessions, 0),
      gradesOutstanding: classes.filter(
        (c) => open.includes(c.gradeStatus) && c._count.enrollments > 0,
      ).length,
      returned: classes.filter((c) => c.gradeStatus === GradeStatus.RETURNED)
        .length,
      averageAttendance: records ? Math.round((present / records) * 100) : null,
    };
  }

  private async approvalFigures(user: AuthUser) {
    const pending = await this.prisma.courseOffering.findMany({
      where: {
        gradeStatus: GradeStatus.SUBMITTED,
        course: { program: { departmentId: user.departmentId ?? '' } },
      },
      take: RECENT_LIMIT,
      select: {
        id: true,
        course: { select: { code: true, title: true } },
        lecturer: { select: { fullName: true } },
        _count: {
          select: {
            enrollments: { where: { status: EnrollmentStatus.REGISTERED } },
          },
        },
      },
    });
    const unassigned = await this.prisma.courseOffering.count({
      where: {
        lecturerId: null,
        term: { isCurrent: true },
        course: { program: { departmentId: user.departmentId ?? '' } },
      },
    });
    return { pending, pendingCount: pending.length, unassigned };
  }

  private async financeFigures() {
    const [report, pendingPayments] = await Promise.all([
      this.finance.report(),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          amount: true,
          method: true,
          reference: true,
          createdAt: true,
          invoice: {
            select: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  registrationNumber: true,
                },
              },
            },
          },
        },
      }),
    ]);
    const pendingCount = await this.prisma.payment.count({
      where: { status: PaymentStatus.PENDING },
    });
    return {
      ...report.totals,
      collectionRate: report.collectionRate,
      pendingPayments,
      pendingCount,
    };
  }

  private async requestFigures(user: AuthUser) {
    const [groups, unassigned, mine, upcoming] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.serviceRequest.count({
        where: { assignedToId: null, status: RequestStatus.OPEN },
      }),
      this.prisma.serviceRequest.count({
        where: { assignedToId: user.id, status: RequestStatus.IN_PROGRESS },
      }),
      this.prisma.serviceRequest.findMany({
        where: {
          appointmentAt: { gte: new Date() },
          status: { in: [RequestStatus.OPEN, RequestStatus.IN_PROGRESS] },
        },
        orderBy: { appointmentAt: 'asc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          subject: true,
          appointmentAt: true,
          student: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);
    const byStatus = Object.fromEntries(
      Object.values(RequestStatus).map((s) => [s, 0]),
    ) as Record<RequestStatus, number>;
    for (const g of groups) byStatus[g.status] = g._count._all;
    const queue = await this.prisma.serviceRequest.findMany({
      where: {
        status: { in: [RequestStatus.OPEN, RequestStatus.IN_PROGRESS] },
      },
      orderBy: { createdAt: 'asc' },
      take: RECENT_LIMIT,
      select: {
        id: true,
        type: true,
        subject: true,
        status: true,
        createdAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });
    return { byStatus, unassigned, mine, upcoming, queue };
  }

  private async admissionFigures() {
    const [groups, latest] = await Promise.all([
      this.prisma.application.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.application.findMany({
        where: {
          status: {
            in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW],
          },
        },
        orderBy: { createdAt: 'asc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          program: { select: { code: true } },
        },
      }),
    ]);
    const byStatus = Object.fromEntries(
      Object.values(ApplicationStatus).map((s) => [s, 0]),
    ) as Record<ApplicationStatus, number>;
    for (const g of groups) byStatus[g.status] = g._count._all;
    return { byStatus, latest };
  }

  private async studentPortalFigures(user: AuthUser) {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!student) return null;
    const [enrollments, invoices, openRequests] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          studentId: student.id,
          status: EnrollmentStatus.REGISTERED,
          offering: { term: { isCurrent: true } },
        },
        select: {
          offering: { select: { course: { select: { credits: true } } } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { studentId: student.id },
        select: {
          amount: true,
          waiverAmount: true,
          payments: { select: { amount: true, status: true } },
        },
      }),
      this.prisma.serviceRequest.count({
        where: {
          studentId: student.id,
          status: { in: [RequestStatus.OPEN, RequestStatus.IN_PROGRESS] },
        },
      }),
    ]);
    const balance = invoices.reduce((s, i) => s + invoiceTotals(i).balance, 0);
    return {
      registeredCourses: enrollments.length,
      registeredCredits: enrollments.reduce(
        (s, e) => s + e.offering.course.credits,
        0,
      ),
      feeBalance: balance,
      openRequests,
    };
  }

  /**
   * Students in scope who need attention this term: a score below the pass mark,
   * or attendance under 75% once at least three sessions are recorded.
   */
  private async atRisk(scope: object) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        status: EnrollmentStatus.REGISTERED,
        student: scope,
        offering: { term: { isCurrent: true } },
      },
      select: {
        studentId: true,
        score: true,
        attendance: { select: { present: true } },
      },
    });
    const flagged = new Set<string>();
    for (const e of enrollments) {
      const lowScore = e.score !== null && e.score < PASS_MARK;
      const sessions = e.attendance.length;
      const lowAttendance =
        sessions >= 3 &&
        e.attendance.filter((a) => a.present).length / sessions < 0.75;
      if (lowScore || lowAttendance) flagged.add(e.studentId);
    }
    return flagged.size;
  }
}
