import { Controller, Get, Header } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@Can(AccessPolicy, 'viewReports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser() actor: AuthUser) {
    return this.reports.overview(actor);
  }

  @Get('students.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="students.csv"')
  studentsCsv(@CurrentUser() actor: AuthUser) {
    return this.reports.studentsCsv(actor);
  }
}
