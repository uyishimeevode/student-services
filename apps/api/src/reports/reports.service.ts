import { Injectable } from '@nestjs/common';
import { GradeStatus, Role, StudentStatus } from '../generated/prisma/enums.js';
import type { AuthUser } from '../common/auth-user.js';
import { PASS_MARK } from '../courses/grading.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
  ) {}

  /** Department filter for the actor: Head of Department their own, Dean their faculty's, Registrar all. */
  private departmentScope(actor: AuthUser) {
    if (actor.role === Role.HEAD_OF_DEPARTMENT)
      return { id: actor.departmentId ?? '' };
    if (actor.role === Role.DEAN) return { facultyId: actor.facultyId ?? '' };
    return {};
  }

  /** Per department: students by status, programmes, courses, approved-grade results and pending approvals. */
  async overview(actor: AuthUser) {
    const departments = await this.prisma.department.findMany({
      where: this.departmentScope(actor),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        faculty: { select: { name: true } },
        _count: { select: { programs: true } },
      },
    });
    const rows = await Promise.all(
      departments.map(async (d) => {
        const inDepartment = { program: { departmentId: d.id } };
        const [statusGroups, courses, results, pendingApprovals] =
          await Promise.all([
            this.prisma.student.groupBy({
              by: ['status'],
              where: inDepartment,
              _count: { _all: true },
            }),
            this.prisma.course.count({ where: inDepartment }),
            this.prisma.enrollment.findMany({
              where: {
                offering: {
                  gradeStatus: GradeStatus.APPROVED,
                  course: inDepartment,
                },
              },
              select: { score: true },
            }),
            this.prisma.courseOffering.count({
              where: {
                gradeStatus: GradeStatus.SUBMITTED,
                course: inDepartment,
              },
            }),
          ]);
        const byStatus = Object.fromEntries(
          Object.values(StudentStatus).map((s) => [s, 0]),
        ) as Record<StudentStatus, number>;
        for (const g of statusGroups) byStatus[g.status] = g._count._all;
        const scores = results
          .map((r) => r.score)
          .filter((s): s is number => s !== null);
        return {
          ...d,
          programs: d._count.programs,
          courses,
          students: Object.values(byStatus).reduce((a, b) => a + b, 0),
          byStatus,
          averageScore: scores.length
            ? Math.round(
                (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
              ) / 10
            : null,
          passRate: scores.length
            ? Math.round(
                (scores.filter((s) => s >= PASS_MARK).length / scores.length) *
                  100,
              )
            : null,
          resultsCount: scores.length,
          pendingApprovals,
        };
      }),
    );
    return {
      departments: rows,
      totals: {
        students: rows.reduce((s, r) => s + r.students, 0),
        programs: rows.reduce((s, r) => s + r.programs, 0),
        courses: rows.reduce((s, r) => s + r.courses, 0),
        pendingApprovals: rows.reduce((s, r) => s + r.pendingApprovals, 0),
      },
    };
  }

  /** Student list in the actor's scope as CSV. */
  async studentsCsv(actor: AuthUser): Promise<string> {
    const students = await this.prisma.student.findMany({
      where: this.students.scopeFor(actor),
      orderBy: [{ program: { code: 'asc' } }, { lastName: 'asc' }],
      select: {
        registrationNumber: true,
        firstName: true,
        lastName: true,
        gender: true,
        phone: true,
        intakeYear: true,
        yearOfStudy: true,
        status: true,
        user: { select: { email: true } },
        program: {
          select: {
            code: true,
            name: true,
            department: { select: { name: true } },
          },
        },
      },
    });
    const header = [
      'Registration number',
      'First name',
      'Last name',
      'Gender',
      'Email',
      'Phone',
      'Programme',
      'Department',
      'Intake',
      'Year',
      'Status',
    ];
    const lines = students.map((s) =>
      [
        s.registrationNumber,
        s.firstName,
        s.lastName,
        s.gender,
        s.user.email,
        s.phone,
        `${s.program.code} ${s.program.name}`,
        s.program.department.name,
        s.intakeYear,
        s.yearOfStudy,
        s.status,
      ]
        .map(csvCell)
        .join(','),
    );
    return [header.join(','), ...lines].join('\n') + '\n';
  }
}
