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
import { ROLE_PERMISSIONS } from '../common/permissions.js';
import {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  type CreateUser,
  type ListUsers,
  type UpdateUser,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

const idSchema = z.uuid();

@Controller('users')
@Can(AccessPolicy, 'manageUsers')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createUserSchema }) body: CreateUser,
  ) {
    return this.users.create(actor, body);
  }

  @Get()
  list(@Query({ schema: listUsersSchema }) query: ListUsers) {
    return this.users.list(query);
  }

  /** The role to permission matrix, for the Roles and Permissions page. Declared before ':id'. */
  @Get('roles')
  roles() {
    return Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
      role,
      permissions,
    }));
  }

  @Get(':id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateUserSchema }) body: UpdateUser,
  ) {
    return this.users.update(actor, id, body);
  }

  @Post(':id/reset-password')
  resetPassword(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
  ) {
    return this.users.resetPassword(actor, id);
  }
}
