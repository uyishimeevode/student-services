import { z } from 'zod';

export const listOfferingsSchema = z.object({ termId: z.uuid().optional() });
export type ListOfferings = z.infer<typeof listOfferingsSchema>;

export const createOfferingSchema = z.object({
  courseId: z.uuid(),
  termId: z.uuid(),
  lecturerId: z.uuid().nullable().optional(),
});
export type CreateOffering = z.infer<typeof createOfferingSchema>;

export const assignLecturerSchema = z.object({
  lecturerId: z.uuid().nullable(),
});
export type AssignLecturer = z.infer<typeof assignLecturerSchema>;

export const bookModulesSchema = z.object({
  offeringIds: z.array(z.uuid()).min(1).max(20),
});
export type BookModules = z.infer<typeof bookModulesSchema>;

export const attendanceSchema = z.object({
  date: z.iso.date().transform((v) => new Date(`${v}T00:00:00.000Z`)),
  topic: z.string().trim().max(200).optional(),
  presentEnrollmentIds: z.array(z.uuid()),
});
export type RecordAttendance = z.infer<typeof attendanceSchema>;

export const gradesSchema = z.object({
  scores: z.array(
    z.object({
      enrollmentId: z.uuid(),
      score: z.number().min(0).max(100).nullable(),
    }),
  ),
  submit: z.boolean().default(false),
});
export type SaveGrades = z.infer<typeof gradesSchema>;

export const materialSchema = z.object({
  title: z.string().trim().min(2).max(150),
  url: z.url({ protocol: /^https?$/ }),
});
export type CreateMaterial = z.infer<typeof materialSchema>;

export const gradeDecisionSchema = z
  .object({
    decision: z.enum(['APPROVE', 'RETURN']),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.decision === 'APPROVE' || (d.note && d.note.length >= 3), {
    message: 'Give a reason when returning grades',
    path: ['note'],
  });
export type GradeDecision = z.infer<typeof gradeDecisionSchema>;
