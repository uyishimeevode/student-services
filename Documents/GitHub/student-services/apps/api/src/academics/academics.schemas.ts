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

export const createTermSchema = z
  .object({
    name: z.string().trim().min(3).max(60),
    startDate: z.iso.date().transform((v) => new Date(`${v}T00:00:00.000Z`)),
    endDate: z.iso.date().transform((v) => new Date(`${v}T00:00:00.000Z`)),
    feePerCredit: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((t) => t.endDate > t.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });
export type CreateTerm = z.infer<typeof createTermSchema>;

export const updateTermSchema = z
  .object({
    isCurrent: z.literal(true),
    registrationOpen: z.boolean(),
    feePerCredit: z.number().int().min(0).max(1_000_000),
  })
  .partial()
  .refine((t) => Object.keys(t).length > 0, { message: 'Nothing to update' });
export type UpdateTerm = z.infer<typeof updateTermSchema>;

export const createCourseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]{3,12}$/,
      'Code must be 3 to 12 letters, digits or dashes',
    ),
  title: z.string().trim().min(3).max(150),
  credits: z.number().int().min(1).max(30),
  yearLevel: z.number().int().min(1).max(7),
  semester: z.number().int().min(1).max(3),
  programId: z.uuid(),
});
export type CreateCourse = z.infer<typeof createCourseSchema>;

export const listCoursesSchema = z.object({
  programId: z.uuid().optional(),
  yearLevel: z.coerce.number().int().min(1).max(7).optional(),
});
export type ListCourses = z.infer<typeof listCoursesSchema>;
