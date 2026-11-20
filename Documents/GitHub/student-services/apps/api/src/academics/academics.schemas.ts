import { z } from 'zod';

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{2,12}$/, 'Code must be 2 to 12 letters, digits or dashes');
const name = z.string().trim().min(2).max(150);

export const createFacultySchema = z.object({ code, name });
export type CreateFaculty = z.infer<typeof createFacultySchema>;

export const createDepartmentSchema = z.object({
  code,
  name,
  facultyId: z.uuid(),
});
export type CreateDepartment = z.infer<typeof createDepartmentSchema>;

export const createProgramSchema = z.object({
  code,
  name,
  departmentId: z.uuid(),
  durationYears: z.number().int().min(1).max(7),
});
export type CreateProgram = z.infer<typeof createProgramSchema>;
