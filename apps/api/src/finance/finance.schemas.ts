import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '../generated/prisma/enums.js';

const date = z.iso.date().transform((v) => new Date(`${v}T00:00:00.000Z`));

/** Bill one student, or every active student of a programme and year of study. */
export const createInvoiceSchema = z
  .object({
    studentId: z.uuid().optional(),
    programId: z.uuid().optional(),
    yearOfStudy: z.number().int().min(1).max(7).optional(),
    termId: z.uuid().optional(),
    description: z.string().trim().min(3).max(150),
    amount: z.number().int().min(1).max(100_000_000),
    dueDate: date,
  })
  .refine((i) => i.studentId || i.programId, {
    message: 'Choose a student or a programme',
    path: ['studentId'],
  });
export type CreateInvoice = z.infer<typeof createInvoiceSchema>;

export const waiverSchema = z.object({
  amount: z.number().int().min(0),
  reason: z.string().trim().min(3).max(300),
});
export type Waiver = z.infer<typeof waiverSchema>;

export const listInvoicesSchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
});
export type ListInvoices = z.infer<typeof listInvoicesSchema>;

export const listPaymentsSchema = z.object({
  status: z.enum(PaymentStatus).optional(),
});
export type ListPayments = z.infer<typeof listPaymentsSchema>;

export const reviewPaymentSchema = z
  .object({
    status: z.enum([PaymentStatus.VERIFIED, PaymentStatus.REJECTED]),
    note: z.string().trim().max(300).optional(),
  })
  .refine(
    (r) =>
      r.status === PaymentStatus.VERIFIED || (r.note && r.note.length >= 3),
    {
      message: 'Give a reason when rejecting a payment',
      path: ['note'],
    },
  );
export type ReviewPayment = z.infer<typeof reviewPaymentSchema>;

export const submitPaymentSchema = z.object({
  amount: z.number().int().min(1),
  method: z.enum(PaymentMethod),
  reference: z.string().trim().min(3).max(80),
});
export type SubmitPayment = z.infer<typeof submitPaymentSchema>;
