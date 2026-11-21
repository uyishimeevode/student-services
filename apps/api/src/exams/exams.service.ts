import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { EnrollmentStatus } from '../generated/prisma/enums.js';
import type { AuthUser } from '../common/auth-user.js';
import type { Env } from '../config/env.js';
import { CoursesService } from '../courses/courses.service.js';
import { invoiceTotals } from '../finance/finance.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';

/** Share of the term's fees that must be paid (verified) before the CAT card is issued. */
export const CAT_CARD_THRESHOLD = 0.5;

type CardType = 'CAT' | 'EXAM';

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly courses: CoursesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** A short code printed on each card. Recomputing it from the same inputs proves the card came from the system. */
  verificationCode(
    type: CardType | 'TRANSCRIPT',
    studentId: string,
    scope: string,
  ): string {
    return createHmac('sha256', this.config.get('JWT_SECRET', { infer: true }))
      .update(`${type}:${studentId}:${scope}`)
      .digest('hex')
      .slice(0, 10)
      .toUpperCase();
  }

  /**
   * Fee clearance for the current term and the cards it unlocks. The CAT card needs half the term's
   * fees paid, the exam card all of them. Card contents are only returned when the student qualifies.
   */
  async myDocuments(actor: AuthUser) {
    const own = await this.students.requireOwnRecord(actor);
    const [student, term] = await Promise.all([
      this.prisma.student.findUniqueOrThrow({
        where: { id: own.id },
        select: {
          id: true,
          registrationNumber: true,
          firstName: true,
          lastName: true,
          gender: true,
          yearOfStudy: true,
          intakeYear: true,
          status: true,
          program: {
            select: {
              code: true,
              name: true,
              department: {
                select: { name: true, faculty: { select: { name: true } } },
              },
            },
          },
        },
      }),
      this.prisma.academicTerm.findFirst({ where: { isCurrent: true } }),
    ]);
    if (!term)
      return {
        student,
        term: null,
        fees: null,
        modules: [],
        cat: null,
        exam: null,
      };

    const [invoices, enrollments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { studentId: student.id, termId: term.id },
        select: {
          amount: true,
          waiverAmount: true,
          payments: { select: { amount: true, status: true } },
        },
      }),
      this.prisma.enrollment.findMany({
        where: {
          studentId: student.id,
          status: EnrollmentStatus.REGISTERED,
          offering: { termId: term.id },
        },
        orderBy: { offering: { course: { code: 'asc' } } },
        select: {
          offering: {
            select: {
              course: { select: { code: true, title: true, credits: true } },
            },
          },
        },
      }),
    ]);
    const totals = invoices.map((i) => invoiceTotals(i));
    const due = totals.reduce((s, t) => s + t.due, 0);
    const paid = totals.reduce((s, t) => s + t.paid, 0);
    const balance = totals.reduce((s, t) => s + t.balance, 0);
    const paidShare = due === 0 ? 1 : paid / due;
    const modules = enrollments.map((e) => e.offering.course);
    const active = student.status === 'ACTIVE';

    const card = (type: CardType, ok: boolean, reason: string) =>
      ok
        ? {
            issued: true as const,
            number: `${type}-${student.registrationNumber}-${term.name.replace(/[^0-9]/g, '').slice(0, 8)}`,
            verificationCode: this.verificationCode(type, student.id, term.id),
            issuedAt: new Date(),
          }
        : { issued: false as const, reason };

    const blocked = !active
      ? 'Your student status is not active'
      : modules.length === 0
        ? 'You have no registered modules this term'
        : null;
    return {
      student,
      term: {
        id: term.id,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
      },
      fees: {
        due,
        paid,
        balance,
        paidPercent: Math.floor(paidShare * 100),
        catThresholdPercent: CAT_CARD_THRESHOLD * 100,
      },
      modules,
      cat: card(
        'CAT',
        !blocked && paidShare >= CAT_CARD_THRESHOLD,
        blocked ??
          `Pay at least ${CAT_CARD_THRESHOLD * 100}% of this term's fees`,
      ),
      exam: card(
        'EXAM',
        !blocked && balance === 0,
        blocked ?? "Clear this term's fee balance",
      ),
    };
  }

  /** Approved results with student details, for printing as a provisional transcript. */
  async provisionalTranscript(actor: AuthUser) {
    const own = await this.students.requireOwnRecord(actor);
    const [student, results] = await Promise.all([
      this.prisma.student.findUniqueOrThrow({
        where: { id: own.id },
        select: {
          id: true,
          registrationNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          intakeYear: true,
          yearOfStudy: true,
          program: {
            select: {
              code: true,
              name: true,
              department: {
                select: { name: true, faculty: { select: { name: true } } },
              },
            },
          },
        },
      }),
      this.courses.myGrades(actor),
    ]);
    const issuedAt = new Date();
    return {
      student,
      ...results,
      issuedAt,
      verificationCode: this.verificationCode(
        'TRANSCRIPT',
        student.id,
        issuedAt.toISOString().slice(0, 10),
      ),
    };
  }
}
