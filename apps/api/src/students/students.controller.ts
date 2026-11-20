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
  changeStatusSchema,
  listStudentsSchema,
  registerStudentSchema,
  updateStudentSchema,
  type ChangeStatus,
  type ListStudents,
  type RegisterStudent,
  type UpdateStudent,
} from './students.schemas.js';
import { StudentsService } from './students.service.js';

const idSchema = z.uuid();

@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @Can(AccessPolicy, 'registerStudents')
  register(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: registerStudentSchema }) body: RegisterStudent,
  ) {
    return this.students.register(actor, body);
  }

  @Get()
  @Can(AccessPolicy, 'listStudents')
  list(
    @CurrentUser() actor: AuthUser,
    @Query({ schema: listStudentsSchema }) query: ListStudents,
  ) {
    return this.students.list(actor, query);
  }

  // Declared before ':id' so Express does not read "me" as an id.
  @Get('me')
  @Can.Anyone()
  findMine(@CurrentUser() actor: AuthUser) {
    return this.students.findMine(actor);
  }

  @Get(':id')
  @Can.Anyone()
  findOne(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
  ) {
    return this.students.findOne(actor, id);
  }

  @Patch(':id')
  @Can(AccessPolicy, 'updateStudents')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateStudentSchema }) body: UpdateStudent,
  ) {
    return this.students.update(actor, id, body);
  }

  @Patch(':id/status')
  @Can(AccessPolicy, 'changeStudentStatus')
  changeStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: changeStatusSchema }) body: ChangeStatus,
  ) {
    return this.students.changeStatus(actor, id, body);
  }
}
