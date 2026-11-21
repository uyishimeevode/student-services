import { z } from 'zod';
import { ApplicationStatus, Gender } from '../generated/prisma/enums.js';

const currentYear = new Date().getUTCFullYear();

export const applySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email().trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9]{9,15}$/,
      'Phone must be 9 to 15 digits, optionally starting with +',
    ),
  gender: z.enum(Gender),
  dateOfBirth: z.iso.date().transform((v) => new Date(`${v}T00:00:00.000Z`)),
  previousSchool: z.string().trim().min(2).max(150),
  programId: z.uuid(),
  intakeYear: z
    .number()
    .int()
    .min(currentYear)
    .max(currentYear + 1),
});
export type Apply = z.infer<typeof applySchema>;

export const listApplicationsSchema = z.object({
  status: z.enum(ApplicationStatus).optional(),
  search: z.string().trim().min(1).optional(),
});
export type ListApplications = z.infer<typeof listApplicationsSchema>;

export const reviewApplicationSchema = z
  .object({
    status: z.enum([
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.OFFERED,
      ApplicationStatus.REJECTED,
    ]),
    documentsVerified: z.boolean(),
    decisionNote: z.string().trim().max(500),
  })
  .partial()
  .refine((r) => Object.keys(r).length > 0, { message: 'Nothing to update' });
export type ReviewApplication = z.infer<typeof reviewApplicationSchema>;
