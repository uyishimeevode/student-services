import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { AUTH_USER_SELECT, type AuthUser } from '../common/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class JwtAuth extends JwtBearerProvider<AuthUser> {
  constructor(
    private readonly prisma: PrismaService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this, { order: 1 });
  }

  /** Loads the user on every request, so a deactivated account or a role change applies at once. */
  async validate({ sub }: JwtClaims) {
    if (!sub) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: AUTH_USER_SELECT,
    });
    return user?.isActive ? user : null;
  }
}
