import { z } from 'zod';
import { Role } from '../generated/prisma/enums.js';

/** Student accounts are created through student registration, not here. */
export const staffRoles = Object.values(Role).filter(
  (role) => role !== Role.STUDENT,
) as [Role, ...Role[]];

const scopeFields = {
  departmentId: z.uuid().nullable().optional(),
  facultyId: z.uuid().nullable().optional(),
};

export const createUserSchema = z.object({
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(staffRoles),
  ...scopeFields,
});
export type CreateUser = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    role: z.enum(staffRoles),
    isActive: z.boolean(),
    ...scopeFields,
  })
  .partial();
export type UpdateUser = z.infer<typeof updateUserSchema>;

export const listUsersSchema = z.object({
  role: z.enum(Role).optional(),
  search: z.string().trim().min(1).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListUsers = z.infer<typeof listUsersSchema>;
