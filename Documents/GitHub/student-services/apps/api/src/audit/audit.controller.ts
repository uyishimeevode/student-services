import { Controller, Get, Query } from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../common/access.policy.js';
import {
  auditQuerySchema,
  AuditService,
  type AuditQuery,
} from './audit.service.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Can(AccessPolicy, 'viewAuditLogs')
  list(@Query({ schema: auditQuerySchema }) query: AuditQuery) {
    return this.audit.list(query);
  }
}
