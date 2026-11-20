import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import type { AuthUser } from '../common/auth-user.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** Every signed-in user has a dashboard; the service decides which sections their role gets. */
  @Get()
  @Can.Anyone()
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.forUser(user);
  }
}
