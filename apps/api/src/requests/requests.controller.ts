import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { z } from 'zod';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import {
  listRequestsSchema,
  submitRequestSchema,
  updateRequestSchema,
  type ListRequests,
  type SubmitRequest,
  type UpdateRequest,
} from './requests.schemas.js';
import { RequestsService } from './requests.service.js';

const idSchema = z.uuid();

@Controller('my/requests')
@Can(AccessPolicy, 'submitRequests')
export class MyRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  mine(@CurrentUser() actor: AuthUser) {
    return this.requests.mine(actor);
  }

  @Post()
  submit(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: submitRequestSchema }) body: SubmitRequest,
  ) {
    return this.requests.submit(actor, body);
  }
}

@Controller('requests')
@Can(AccessPolicy, 'manageRequests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list(
    @CurrentUser() actor: AuthUser,
    @Query({ schema: listRequestsSchema }) query: ListRequests,
  ) {
    return this.requests.list(actor, query);
  }

  @Get(':id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.requests.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateRequestSchema }) body: UpdateRequest,
  ) {
    return this.requests.update(actor, id, body);
  }
}
