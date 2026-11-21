import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { z } from 'zod';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import {
  applySchema,
  listApplicationsSchema,
  reviewApplicationSchema,
  type Apply,
  type ListApplications,
  type ReviewApplication,
} from './admissions.schemas.js';
import { AdmissionsService } from './admissions.service.js';

const idSchema = z.uuid();

/** The public application form. */
@Public()
@Controller('public')
export class PublicAdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Get('programs')
  programs() {
    return this.admissions.programs();
  }

  @Post('applications')
  apply(@Body({ schema: applySchema }) body: Apply) {
    return this.admissions.apply(body);
  }
}

@Controller('applications')
@Can(AccessPolicy, 'manageApplications')
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Get()
  list(@Query({ schema: listApplicationsSchema }) query: ListApplications) {
    return this.admissions.list(query);
  }

  @Get(':id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.admissions.findOne(id);
  }

  @Patch(':id')
  review(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: reviewApplicationSchema }) body: ReviewApplication,
  ) {
    return this.admissions.review(actor, id, body);
  }

  @Post(':id/enroll')
  @HttpCode(200)
  enroll(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
  ) {
    return this.admissions.enroll(actor, id);
  }
}
