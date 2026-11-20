import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser, Public, TokenService } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import type { AuthUser } from '../common/auth-user.js';
import { permissionsFor } from '../common/permissions.js';
import { AuditService } from '../audit/audit.service.js';
import {
  changePasswordSchema,
  signInSchema,
  type ChangePassword,
  type SignIn,
} from './auth.schemas.js';
import { CredentialsService } from './credentials.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  async signIn(@Body({ schema: signInSchema }) body: SignIn) {
    const user = await this.credentials.verify(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const issued = await this.tokens.issue(user.id, { method: 'password' });
    await this.audit.record({
      actorId: user.id,
      action: 'auth.sign_in',
      entity: 'user',
      entityId: user.id,
    });
    return {
      accessToken: issued.accessToken,
      expiresIn: issued.expiresIn,
      user: this.profile(user),
    };
  }

  @Get('me')
  @Can.Anyone()
  me(@CurrentUser() user: AuthUser) {
    return this.profile(user);
  }

  @Post('change-password')
  @Can.Anyone()
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body({ schema: changePasswordSchema }) body: ChangePassword,
  ) {
    const changed = await this.credentials.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
    if (!changed)
      throw new UnauthorizedException('Current password is incorrect');
    await this.audit.record({
      actorId: user.id,
      action: 'auth.change_password',
      entity: 'user',
      entityId: user.id,
    });
  }

  private profile(user: AuthUser) {
    return { ...user, permissions: permissionsFor(user.role) };
  }
}
