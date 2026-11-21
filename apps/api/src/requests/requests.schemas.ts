import { z } from 'zod';
import { RequestStatus, RequestType } from '../generated/prisma/enums.js';

export const submitRequestSchema = z.object({
  type: z.enum(RequestType),
  subject: z.string().trim().min(3).max(150),
  description: z.string().trim().min(5).max(2000),
});
export type SubmitRequest = z.infer<typeof submitRequestSchema>;

export const listRequestsSchema = z.object({
  status: z.enum(RequestStatus).optional(),
  type: z.enum(RequestType).optional(),
  assigned: z.enum(['me', 'unassigned']).optional(),
});
export type ListRequests = z.infer<typeof listRequestsSchema>;

export const updateRequestSchema = z
  .object({
    status: z.enum(RequestStatus),
    assignToMe: z.literal(true),
    response: z.string().trim().max(2000),
    appointmentAt: z.iso
      .datetime({ offset: true, local: true })
      .transform((v) => new Date(v))
      .nullable(),
  })
  .partial()
  .refine((u) => Object.keys(u).length > 0, { message: 'Nothing to update' });
export type UpdateRequest = z.infer<typeof updateRequestSchema>;
