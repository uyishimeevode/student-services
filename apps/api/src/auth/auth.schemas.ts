import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});
export type SignIn = z.infer<typeof signInSchema>;

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordRule,
});
export type ChangePassword = z.infer<typeof changePasswordSchema>;
