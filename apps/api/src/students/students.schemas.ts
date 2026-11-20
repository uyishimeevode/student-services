import { z } from 'zod';
import { Gender, StudentStatus } from '../generated/prisma/enums.js';

const currentYear = new Date().getUTCFullYear();

const personalFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  gender: z.enum(Gender),
  dateOfBirth: z.iso
    .date()
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9]{9,15}$/,
      'Phone must be 9 to 15 digits, optionally starting with +',
    ),
  address: z.string().trim().max(200).optional(),
};

export const registerStudentSchema = z.object({
  ...personalFields,
  email: z.email().trim().toLowerCase(),
  programId: z.uuid(),
  intakeYear: z
    .number()
    .int()
    .min(2000)
    .max(currentYear + 1),
  yearOfStudy: z.number().int().min(1).max(7).default(1),
});
export type RegisterStudent = z.infer<typeof registerStudentSchema>;

export const updateStudentSchema = z
  .object({
    ...personalFields,
    address: z.string().trim().max(200).nullable(),
    programId: z.uuid(),
    yearOfStudy: z.number().int().min(1).max(7),
  })
  .partial();
export type UpdateStudent = z.infer<typeof updateStudentSchema>;

export const changeStatusSchema = z.object({
  status: z.enum(StudentStatus),
  reason: z.string().trim().min(3).max(500),
});
export type ChangeStatus = z.infer<typeof changeStatusSchema>;

export const listStudentsSchema = z.object({
  search: z.string().trim().min(1).optional(),
  programId: z.uuid().optional(),
  status: z.enum(StudentStatus).optional(),
  intakeYear: z.coerce.number().int().optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListStudents = z.infer<typeof listStudentsSchema>;
