import type { Role } from '../generated/prisma/enums.js';

/** The signed-in user, loaded from the database on every request. Never carries the password hash. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  departmentId: string | null;
  facultyId: string | null;
}

export const AUTH_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  departmentId: true,
  facultyId: true,
} as const;

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: AuthUser;
  }
}
