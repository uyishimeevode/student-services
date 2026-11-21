import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  GradeStatus,
  PaymentStatus,
  Role,
  StudentStatus,
} from '../generated/prisma/enums.js';
import { invoiceTotals } from '../finance/finance.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../common/auth-user.js';
import { mapPrismaError } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';
import type {
  AssignLecturer,
  CreateMaterial,
  CreateOffering,
  GradeDecision,
  ListOfferings,
  RecordAttendance,
  SaveGrades,
} from './courses.schemas.js';
import { gpa, letterGrade, PASS_MARK } from './grading.js';

const OFFERING_INCLUDE = {
  course: {
    select: {
      id: true,
      code: true,
      title: true,
      credits: true,
      yearLevel: true,
      semester: true,
      program: {
        select: { id: true, code: true, name: true, departmentId: true },
      },
    },
  },
  term: {
    select: { id: true, name: true, isCurrent: true, registrationOpen: true },
  },
  lecturer: { select: { id: true, fullName: true, email: true } },
  _count: {
    select: { enrollments: { where: { status: EnrollmentStatus.REGISTERED } } },
  },
} as const;

/** Grades can be edited while a class is a draft or has been returned by the Head of Department. */
const EDITABLE: GradeStatus[] = [GradeStatus.DRAFT, GradeStatus.RETURNED];

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly audit: AuditService,
  ) {}

  // Offerings: which courses run in a term, and who teaches them

  listOfferings(actor: AuthUser, query: ListOfferings) {
    return this.prisma.courseOffering.findMany({
      where: {
        termId: query.termId,
        ...(actor.role === Role.HEAD_OF_DEPARTMENT
          ? { course: { program: { departmentId: actor.departmentId ?? '' } } }
          : {}),
      },
      orderBy: [{ term: { startDate: 'desc' } }, { course: { code: 'asc' } }],
      include: OFFERING_INCLUDE,
    });
  }

  listLecturers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.LECTURER, Role.HEAD_OF_DEPARTMENT] },
      },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true, role: true },
    });
  }

  async createOffering(actor: AuthUser, input: CreateOffering) {
    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      include: { program: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    this.checkDepartment(actor, course.program.departmentId);
    if (input.lecturerId) await this.checkLecturer(input.lecturerId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const offering = await tx.courseOffering.create({
          data: {
            courseId: input.courseId,
            termId: input.termId,
            lecturerId: input.lecturerId ?? null,
          },
          include: OFFERING_INCLUDE,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'offering.create',
            entity: 'offering',
            entityId: offering.id,
          },
          tx,
        );
        return offering;
      });
    } catch (error) {
      mapPrismaError(error, 'This course is already offered in that term');
    }
  }

  async assignLecturer(
    actor: AuthUser,
    offeringId: string,
    input: AssignLecturer,
  ) {
    const offering = await this.loadOffering(offeringId);
    this.checkDepartment(actor, offering.course.program.departmentId);
    if (input.lecturerId) await this.checkLecturer(input.lecturerId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.courseOffering.update({
        where: { id: offeringId },
        data: { lecturerId: input.lecturerId },
        include: OFFERING_INCLUDE,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'offering.assign_lecturer',
          entity: 'offering',
          entityId: offeringId,
          details: { lecturerId: input.lecturerId },
        },
        tx,
      );
      return updated;
    });
  }

  // Student course registration

  async myCourses(actor: AuthUser) {
    const student = await this.students.requireOwnRecord(actor);
    const [term, history] = await Promise.all([
      this.prisma.academicTerm.findFirst({ where: { isCurrent: true } }),
      this.registrationHistory(student.id),
    ]);
    if (!term)
      return { term: null, basket: [], registered: [], available: [], history };

    const [offerings, enrollments] = await Promise.all([
      this.prisma.courseOffering.findMany({
        where: {
          termId: term.id,
          course: {
            programId: student.programId,
            yearLevel: student.yearOfStudy,
          },
        },
        orderBy: { course: { code: 'asc' } },
        include: OFFERING_INCLUDE,
      }),
      this.prisma.enrollment.findMany({
        where: { studentId: student.id, offering: { termId: term.id } },
        include: {
          offering: { include: OFFERING_INCLUDE },
          invoice: { include: { payments: true } },
        },
        orderBy: { offering: { course: { code: 'asc' } } },
      }),
    ]);
    const taken = new Set(enrollments.map((e) => e.offeringId));
    const rows = enrollments.map((e) => ({
      enrollmentId: e.id,
      status: e.status,
      registeredAt: e.registeredAt,
      fee: e.offering.course.credits * term.feePerCredit,
      invoice: e.invoice
        ? { id: e.invoice.id, ...invoiceTotals(e.invoice) }
        : null,
      ...e.offering,
      canDrop:
        term.registrationOpen &&
        EDITABLE.includes(e.offering.gradeStatus) &&
        e.score === null,
    }));
    const registered = rows.filter(
      (r) => r.status === EnrollmentStatus.REGISTERED,
    );
    return {
      term,
      basket: rows.filter((r) => r.status === EnrollmentStatus.BOOKED),
      registered,
      available: offerings
        .filter((o) => !taken.has(o.id) && EDITABLE.includes(o.gradeStatus))
        .map((o) => ({ ...o, fee: o.course.credits * term.feePerCredit })),
      totalCredits: registered.reduce((sum, r) => sum + r.course.credits, 0),
      history,
    };
  }

  /** Puts modules in the student's basket. Booking reserves nothing until the module is registered. */
  async bookModules(actor: AuthUser, offeringIds: string[]) {
    const student = await this.students.requireOwnRecord(actor);
    if (student.status !== StudentStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active students can register for modules',
      );
    }
    const offerings = await this.prisma.courseOffering.findMany({
      where: { id: { in: offeringIds } },
      include: OFFERING_INCLUDE,
    });
    if (offerings.length !== new Set(offeringIds).size)
      throw new NotFoundException('A module was not found');
    for (const o of offerings) {
      if (!o.term.isCurrent || !o.term.registrationOpen) {
        throw new BadRequestException(
          'Module registration is closed for this term',
        );
      }
      if (!EDITABLE.includes(o.gradeStatus)) {
        throw new BadRequestException(
          `${o.course.code}: grades are already submitted; registration is closed`,
        );
      }
      if (o.course.program.id !== student.programId) {
        throw new ForbiddenException(
          `${o.course.code} is not part of your programme`,
        );
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.enrollment.createMany({
        data: offerings.map((o) => ({
          studentId: student.id,
          offeringId: o.id,
          status: EnrollmentStatus.BOOKED,
        })),
        skipDuplicates: true,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'module.book',
          entity: 'enrollment',
          details: { modules: offerings.map((o) => o.course.code) },
        },
        tx,
      );
      return { booked: created.count };
    });
  }

  /** Generates the module invoice (credits x the term's fee per credit). Asking again returns the same invoice. */
  async moduleInvoice(actor: AuthUser, enrollmentId: string) {
    const enrollment = await this.ownEnrollment(actor, enrollmentId);
    if (enrollment.invoice) return enrollment.invoice;
    const term = enrollment.offering.term;
    const course = enrollment.offering.course;
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 14);
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          studentId: enrollment.studentId,
          termId: term.id,
          enrollmentId,
          description: `Module fee: ${course.code} ${course.title}`,
          amount: course.credits * term.feePerCredit,
          dueDate: new Date(
            Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()),
          ),
        },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'module.invoice',
          entity: 'invoice',
          entityId: invoice.id,
          details: { module: course.code, amount: invoice.amount },
        },
        tx,
      );
      return invoice;
    });
  }

  /** Confirms a booked module. The module invoice must exist; payment can follow. */
  async registerModule(actor: AuthUser, enrollmentId: string) {
    const enrollment = await this.ownEnrollment(actor, enrollmentId);
    if (enrollment.status === EnrollmentStatus.REGISTERED) return enrollment;
    if (!enrollment.offering.term.registrationOpen) {
      throw new BadRequestException(
        'Module registration is closed for this term',
      );
    }
    if (!enrollment.invoice)
      throw new BadRequestException(
        'Get the module invoice before registering',
      );
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.REGISTERED, registeredAt: new Date() },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'module.register',
          entity: 'enrollment',
          entityId: enrollmentId,
          details: { module: enrollment.offering.course.code },
        },
        tx,
      );
      return updated;
    });
  }

  /** Removes a module from the basket or the registration. An unpaid module invoice is cancelled with it. */
  async dropModule(actor: AuthUser, enrollmentId: string) {
    const enrollment = await this.ownEnrollment(actor, enrollmentId);
    if (
      !enrollment.offering.term.registrationOpen ||
      enrollment.score !== null
    ) {
      throw new BadRequestException('This module can no longer be dropped');
    }
    const paid =
      enrollment.invoice?.payments.some(
        (p) => p.status !== PaymentStatus.REJECTED,
      ) ?? false;
    if (paid) {
      throw new BadRequestException(
        'A payment was made for this module; ask the finance office to drop it',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      if (enrollment.invoice)
        await tx.invoice.delete({ where: { id: enrollment.invoice.id } });
      await tx.enrollment.delete({ where: { id: enrollmentId } });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'module.drop',
          entity: 'enrollment',
          entityId: enrollmentId,
          details: { module: enrollment.offering.course.code },
        },
        tx,
      );
    });
  }

  /** One row per term: stage, modules taken, registration date and money billed and paid for that term. */
  private async registrationHistory(studentId: string) {
    const [enrollments, invoices] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId, status: EnrollmentStatus.REGISTERED },
        select: {
          registeredAt: true,
          createdAt: true,
          offering: {
            select: {
              term: { select: { id: true, name: true, startDate: true } },
              course: {
                select: {
                  code: true,
                  title: true,
                  credits: true,
                  yearLevel: true,
                  semester: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.invoice.findMany({
        where: { studentId, termId: { not: null } },
        select: {
          termId: true,
          amount: true,
          waiverAmount: true,
          payments: { select: { amount: true, status: true } },
        },
      }),
    ]);
    const terms = new Map<
      string,
      {
        termId: string;
        term: string;
        startDate: Date;
        stage: string;
        registeredAt: Date;
        modules: { code: string; title: string; credits: number }[];
      }
    >();
    for (const e of enrollments) {
      const t = e.offering.term;
      const c = e.offering.course;
      const when = e.registeredAt ?? e.createdAt;
      const row = terms.get(t.id) ?? {
        termId: t.id,
        term: t.name,
        startDate: t.startDate,
        stage: `Y${c.yearLevel}S${c.semester}`,
        registeredAt: when,
        modules: [],
      };
      if (when < row.registeredAt) row.registeredAt = when;
      row.modules.push({ code: c.code, title: c.title, credits: c.credits });
      terms.set(t.id, row);
    }
    return [...terms.values()]
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .map((row) => {
        const billed = invoices
          .filter((i) => i.termId === row.termId)
          .map((i) => invoiceTotals(i));
        return {
          ...row,
          units: row.modules.length,
          credits: row.modules.reduce((s, m) => s + m.credits, 0),
          billed: billed.reduce((s, t) => s + t.due, 0),
          paid: billed.reduce((s, t) => s + t.paid, 0),
          pending: billed.reduce((s, t) => s + t.pending, 0),
          balance: billed.reduce((s, t) => s + t.balance, 0),
        };
      });
  }

  private async ownEnrollment(actor: AuthUser, enrollmentId: string) {
    const student = await this.students.requireOwnRecord(actor);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId: student.id },
      include: {
        offering: { include: { term: true, course: true } },
        invoice: { include: { payments: true } },
      },
    });
    if (!enrollment)
      throw new NotFoundException('Module not found in your registration');
    return enrollment;
  }

  // Results

  async myGrades(actor: AuthUser) {
    const student = await this.students.requireOwnRecord(actor);
    return this.transcriptFor(student.id);
  }

  async transcript(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    return this.transcriptFor(studentId);
  }

  /** Approved results grouped by term, with a GPA per term and overall. Unapproved grades are never shown. */
  private async transcriptFor(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        status: EnrollmentStatus.REGISTERED,
        offering: { gradeStatus: GradeStatus.APPROVED },
      },
      include: {
        offering: {
          select: {
            term: { select: { id: true, name: true, startDate: true } },
            course: { select: { code: true, title: true, credits: true } },
          },
        },
      },
    });
    const terms = new Map<
      string,
      {
        id: string;
        name: string;
        startDate: Date;
        results: {
          code: string;
          title: string;
          credits: number;
          score: number | null;
          grade: string | null;
        }[];
      }
    >();
    for (const e of enrollments) {
      const t = e.offering.term;
      if (!terms.has(t.id)) terms.set(t.id, { ...t, results: [] });
      terms
        .get(t.id)!
        .results.push({ ...e.offering.course, score: e.score, grade: e.grade });
    }
    const termList = [...terms.values()]
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((t) => ({
        ...t,
        gpa: gpa(t.results),
        credits: t.results.reduce((s, r) => s + r.credits, 0),
      }));
    const all = termList.flatMap((t) => t.results);
    return {
      terms: termList,
      cumulativeGpa: gpa(all),
      creditsEarned: all
        .filter((r) => (r.score ?? 0) >= PASS_MARK)
        .reduce((s, r) => s + r.credits, 0),
    };
  }

  // Teaching: class lists, attendance, grades and materials

  myClasses(actor: AuthUser) {
    return this.prisma.courseOffering.findMany({
      where: { lecturerId: actor.id },
      orderBy: [{ term: { startDate: 'desc' } }, { course: { code: 'asc' } }],
      include: OFFERING_INCLUDE,
    });
  }

  async classDetail(actor: AuthUser, offeringId: string) {
    const offering = await this.loadOffering(offeringId);
    this.checkClassAccess(actor, offering, false);
    const [enrollments, sessions, materials] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { offeringId, status: EnrollmentStatus.REGISTERED },
        orderBy: [
          { student: { lastName: 'asc' } },
          { student: { firstName: 'asc' } },
        ],
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              registrationNumber: true,
            },
          },
          attendance: { select: { present: true } },
        },
      }),
      this.prisma.attendanceSession.findMany({
        where: { offeringId },
        orderBy: { date: 'desc' },
        include: { records: { select: { enrollmentId: true, present: true } } },
      }),
      this.prisma.courseMaterial.findMany({
        where: { offeringId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      ...offering,
      canEdit: offering.lecturerId === actor.id,
      gradesEditable: EDITABLE.includes(offering.gradeStatus),
      students: enrollments.map((e) => {
        const present = e.attendance.filter((a) => a.present).length;
        return {
          enrollmentId: e.id,
          ...e.student,
          score: e.score,
          grade: e.grade,
          attendanceRate: e.attendance.length
            ? Math.round((present / e.attendance.length) * 100)
            : null,
        };
      }),
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date,
        topic: s.topic,
        present: s.records.filter((r) => r.present).length,
        total: s.records.length,
        presentEnrollmentIds: s.records
          .filter((r) => r.present)
          .map((r) => r.enrollmentId),
      })),
      materials,
    };
  }

  /** Records one class session; recording the same date again replaces that session's register. */
  async recordAttendance(
    actor: AuthUser,
    offeringId: string,
    input: RecordAttendance,
  ) {
    const offering = await this.loadOffering(offeringId);
    this.checkClassAccess(actor, offering, true);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { offeringId, status: EnrollmentStatus.REGISTERED },
      select: { id: true },
    });
    const present = new Set(input.presentEnrollmentIds);
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.upsert({
        where: { offeringId_date: { offeringId, date: input.date } },
        create: { offeringId, date: input.date, topic: input.topic },
        update: { topic: input.topic },
      });
      await tx.attendanceRecord.deleteMany({
        where: { sessionId: session.id },
      });
      await tx.attendanceRecord.createMany({
        data: enrollments.map((e) => ({
          sessionId: session.id,
          enrollmentId: e.id,
          present: present.has(e.id),
        })),
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'attendance.record',
          entity: 'offering',
          entityId: offeringId,
          details: {
            date: input.date.toISOString().slice(0, 10),
            present: present.size,
          },
        },
        tx,
      );
      return {
        sessionId: session.id,
        present: present.size,
        total: enrollments.length,
      };
    });
  }

  async saveGrades(actor: AuthUser, offeringId: string, input: SaveGrades) {
    const offering = await this.loadOffering(offeringId);
    this.checkClassAccess(actor, offering, true);
    if (!EDITABLE.includes(offering.gradeStatus)) {
      throw new BadRequestException(
        'Grades are locked while waiting for approval or after approval',
      );
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: { offeringId, status: EnrollmentStatus.REGISTERED },
      select: { id: true, score: true },
    });
    const known = new Map(enrollments.map((e) => [e.id, e.score]));
    for (const s of input.scores) {
      if (!known.has(s.enrollmentId))
        throw new BadRequestException(
          'A score refers to a student not in this class',
        );
      known.set(s.enrollmentId, s.score);
    }
    if (input.submit && [...known.values()].some((score) => score === null)) {
      throw new BadRequestException(
        'Enter a score for every student before submitting',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      for (const s of input.scores) {
        await tx.enrollment.update({
          where: { id: s.enrollmentId },
          data: {
            score: s.score,
            grade: s.score === null ? null : letterGrade(s.score),
          },
        });
      }
      const status = input.submit
        ? GradeStatus.SUBMITTED
        : offering.gradeStatus;
      await tx.courseOffering.update({
        where: { id: offeringId },
        data: { gradeStatus: status },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: input.submit ? 'grades.submit' : 'grades.save',
          entity: 'offering',
          entityId: offeringId,
        },
        tx,
      );
      return { gradeStatus: status };
    });
  }

  async addMaterial(
    actor: AuthUser,
    offeringId: string,
    input: CreateMaterial,
  ) {
    const offering = await this.loadOffering(offeringId);
    this.checkClassAccess(actor, offering, true);
    return this.prisma.courseMaterial.create({
      data: { offeringId, ...input },
    });
  }

  async removeMaterial(
    actor: AuthUser,
    offeringId: string,
    materialId: string,
  ) {
    const offering = await this.loadOffering(offeringId);
    this.checkClassAccess(actor, offering, true);
    const result = await this.prisma.courseMaterial.deleteMany({
      where: { id: materialId, offeringId },
    });
    if (result.count === 0) throw new NotFoundException('Material not found');
  }

  /** Materials for the courses a student is registered in, newest first. */
  async myMaterials(actor: AuthUser) {
    const student = await this.students.requireOwnRecord(actor);
    return this.prisma.courseMaterial.findMany({
      where: {
        offering: {
          enrollments: {
            some: {
              studentId: student.id,
              status: EnrollmentStatus.REGISTERED,
            },
          },
          term: { isCurrent: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        offering: {
          select: { course: { select: { code: true, title: true } } },
        },
      },
    });
  }

  // Grade approval by the Head of Department

  pendingApprovals(actor: AuthUser) {
    return this.prisma.courseOffering.findMany({
      where: {
        gradeStatus: GradeStatus.SUBMITTED,
        course: { program: { departmentId: actor.departmentId ?? '' } },
      },
      orderBy: { course: { code: 'asc' } },
      include: OFFERING_INCLUDE,
    });
  }

  async decideGrades(
    actor: AuthUser,
    offeringId: string,
    input: GradeDecision,
  ) {
    const offering = await this.loadOffering(offeringId);
    this.checkDepartment(actor, offering.course.program.departmentId);
    if (offering.gradeStatus !== GradeStatus.SUBMITTED) {
      throw new BadRequestException(
        'Only submitted grades can be approved or returned',
      );
    }
    const status =
      input.decision === 'APPROVE'
        ? GradeStatus.APPROVED
        : GradeStatus.RETURNED;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.courseOffering.update({
        where: { id: offeringId },
        data: { gradeStatus: status, gradeNote: input.note ?? null },
        include: OFFERING_INCLUDE,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action:
            input.decision === 'APPROVE' ? 'grades.approve' : 'grades.return',
          entity: 'offering',
          entityId: offeringId,
          details: { note: input.note ?? null },
        },
        tx,
      );
      return updated;
    });
  }

  // Helpers

  private async loadOffering(id: string) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id },
      include: OFFERING_INCLUDE,
    });
    if (!offering) throw new NotFoundException('Class not found');
    return offering;
  }

  private checkDepartment(actor: AuthUser, departmentId: string) {
    if (
      actor.role === Role.HEAD_OF_DEPARTMENT &&
      actor.departmentId !== departmentId
    ) {
      throw new ForbiddenException('This course belongs to another department');
    }
  }

  private async checkLecturer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });
    const roles: Role[] = [Role.LECTURER, Role.HEAD_OF_DEPARTMENT];
    if (!user || !user.isActive || !roles.includes(user.role)) {
      throw new BadRequestException('Choose an active lecturer');
    }
  }

  /** The assigned lecturer can edit; the Head of Department and the Registrar can look. */
  private checkClassAccess(
    actor: AuthUser,
    offering: {
      lecturerId: string | null;
      course: { program: { departmentId: string } };
    },
    edit: boolean,
  ) {
    if (offering.lecturerId === actor.id) return;
    if (!edit) {
      if (actor.role === Role.REGISTRAR) return;
      if (
        actor.role === Role.HEAD_OF_DEPARTMENT &&
        actor.departmentId === offering.course.program.departmentId
      )
        return;
    }
    throw new ForbiddenException(
      edit
        ? 'Only the assigned lecturer can change this class'
        : 'You do not teach this class',
    );
  }
}
