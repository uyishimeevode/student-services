import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, StudentStatus } from '../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../common/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';
import type {
  CreateInvoice,
  ListInvoices,
  ListPayments,
  ReviewPayment,
  SubmitPayment,
  Waiver,
} from './finance.schemas.js';

const INVOICE_INCLUDE = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      registrationNumber: true,
      program: { select: { code: true } },
    },
  },
  term: { select: { id: true, name: true } },
  payments: { orderBy: { createdAt: 'desc' } },
} as const;

interface InvoiceLike {
  amount: number;
  waiverAmount: number;
  payments: { amount: number; status: PaymentStatus }[];
}

/** Paid counts only verified payments; pending ones are shown separately until Finance checks them. */
export function invoiceTotals(invoice: InvoiceLike) {
  const paid = invoice.payments
    .filter((p) => p.status === PaymentStatus.VERIFIED)
    .reduce((s, p) => s + p.amount, 0);
  const pending = invoice.payments
    .filter((p) => p.status === PaymentStatus.PENDING)
    .reduce((s, p) => s + p.amount, 0);
  const due = invoice.amount - invoice.waiverAmount;
  const balance = Math.max(due - paid, 0);
  const status = balance === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
  return { due, paid, pending, balance, status };
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly audit: AuditService,
  ) {}

  async createInvoices(actor: AuthUser, input: CreateInvoice) {
    const studentIds = input.studentId
      ? [input.studentId]
      : (
          await this.prisma.student.findMany({
            where: {
              programId: input.programId,
              yearOfStudy: input.yearOfStudy,
              status: StudentStatus.ACTIVE,
            },
            select: { id: true },
          })
        ).map((s) => s.id);
    if (studentIds.length === 0)
      throw new BadRequestException('No active students match');
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.createMany({
        data: studentIds.map((studentId) => ({
          studentId,
          termId: input.termId,
          description: input.description,
          amount: input.amount,
          dueDate: input.dueDate,
        })),
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'invoice.create',
          entity: 'invoice',
          details: {
            count: created.count,
            amount: input.amount,
            description: input.description,
          },
        },
        tx,
      );
      return created;
    });
    return { created: result.count };
  }

  async listInvoices(query: ListInvoices) {
    const invoices = await this.prisma.invoice.findMany({
      where: query.search
        ? {
            student: {
              OR: [
                { registrationNumber: { contains: query.search } },
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: INVOICE_INCLUDE,
    });
    return invoices
      .map((i) => ({ ...i, ...invoiceTotals(i) }))
      .filter((i) => !query.status || i.status === query.status);
  }

  async applyWaiver(actor: AuthUser, invoiceId: string, input: Waiver) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (input.amount > invoice.amount)
      throw new BadRequestException(
        'The waiver cannot be more than the invoice',
      );
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { waiverAmount: input.amount, waiverReason: input.reason },
        include: INVOICE_INCLUDE,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'invoice.waiver',
          entity: 'invoice',
          entityId: invoiceId,
          details: input,
        },
        tx,
      );
      return { ...updated, ...invoiceTotals(updated) };
    });
  }

  listPayments(query: ListPayments) {
    return this.prisma.payment.findMany({
      where: { status: query.status },
      orderBy: {
        createdAt: query.status === PaymentStatus.PENDING ? 'asc' : 'desc',
      },
      take: 200,
      include: {
        invoice: {
          select: {
            id: true,
            description: true,
            student: INVOICE_INCLUDE.student,
          },
        },
      },
    });
  }

  async reviewPayment(
    actor: AuthUser,
    paymentId: string,
    input: ReviewPayment,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING)
      throw new BadRequestException('This payment was already reviewed');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: input.status,
          note: input.note,
          verifiedAt: new Date(),
        },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action:
            input.status === PaymentStatus.VERIFIED
              ? 'payment.verify'
              : 'payment.reject',
          entity: 'payment',
          entityId: paymentId,
          details: { amount: payment.amount, reference: payment.reference },
        },
        tx,
      );
      return updated;
    });
  }

  async report() {
    const [invoices, programs] = await Promise.all([
      this.prisma.invoice.findMany({
        select: {
          amount: true,
          waiverAmount: true,
          payments: { select: { amount: true, status: true } },
          student: { select: { programId: true } },
        },
      }),
      this.prisma.program.findMany({
        select: { id: true, code: true, name: true },
      }),
    ]);
    const empty = () => ({
      billed: 0,
      waived: 0,
      collected: 0,
      pending: 0,
      outstanding: 0,
      invoices: 0,
    });
    const totals = empty();
    const byProgram = new Map<string, ReturnType<typeof empty>>();
    for (const i of invoices) {
      const t = invoiceTotals(i);
      const row = byProgram.get(i.student.programId) ?? empty();
      for (const target of [totals, row]) {
        target.billed += i.amount;
        target.waived += i.waiverAmount;
        target.collected += t.paid;
        target.pending += t.pending;
        target.outstanding += t.balance;
        target.invoices += 1;
      }
      byProgram.set(i.student.programId, row);
    }
    return {
      totals,
      collectionRate:
        totals.billed - totals.waived > 0
          ? Math.round(
              (totals.collected / (totals.billed - totals.waived)) * 100,
            )
          : 0,
      byProgram: programs
        .filter((p) => byProgram.has(p.id))
        .map((p) => ({ ...p, ...byProgram.get(p.id)! })),
    };
  }

  // Student side

  async myFees(actor: AuthUser) {
    const student = await this.students.requireOwnRecord(actor);
    const invoices = await this.prisma.invoice.findMany({
      where: { studentId: student.id },
      orderBy: { dueDate: 'asc' },
      include: INVOICE_INCLUDE,
    });
    const rows = invoices.map((i) => ({ ...i, ...invoiceTotals(i) }));
    return {
      invoices: rows,
      totals: {
        due: rows.reduce((s, r) => s + r.due, 0),
        paid: rows.reduce((s, r) => s + r.paid, 0),
        pending: rows.reduce((s, r) => s + r.pending, 0),
        balance: rows.reduce((s, r) => s + r.balance, 0),
      },
    };
  }

  async submitPayment(
    actor: AuthUser,
    invoiceId: string,
    input: SubmitPayment,
  ) {
    const student = await this.students.requireOwnRecord(actor);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, studentId: student.id },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const totals = invoiceTotals(invoice);
    if (input.amount > totals.balance - totals.pending) {
      throw new BadRequestException(
        'The amount is more than what is left to pay on this invoice',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { invoiceId, ...input },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'payment.submit',
          entity: 'payment',
          entityId: payment.id,
          details: { amount: input.amount },
        },
        tx,
      );
      return payment;
    });
  }
}
