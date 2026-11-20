import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { AUTH_USER_SELECT, type AuthUser } from '../common/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  hash(password: string) {
    return this.passwordHasher.hash(password);
  }

  /** The user, or null when the email or password is wrong or the account is inactive. */
  async verify(email: string, password: string): Promise<AuthUser | null> {
    const found = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...AUTH_USER_SELECT, passwordHash: true },
    });
    // With no account, verify() checks a dummy hash so timing does not reveal which emails exist.
    const valid = await this.passwordHasher.verify(
      password,
      found?.passwordHash,
    );
    if (!valid || !found || !found.isActive) return null;
    const { passwordHash, ...user } = found;
    if (this.passwordHasher.needsRehash(passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.hash(password) },
      });
    }
    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    const valid = await this.passwordHasher.verify(
      currentPassword,
      found?.passwordHash,
    );
    if (!valid || !found) return false;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await this.hash(newPassword),
        mustChangePassword: false,
      },
    });
    return true;
  }
}
