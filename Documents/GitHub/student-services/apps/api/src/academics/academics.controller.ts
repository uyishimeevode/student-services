import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { z } from 'zod';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import {
  createDepartmentSchema,
  createFacultySchema,
  createProgramSchema,
  type CreateDepartment,
  type CreateFaculty,
  type CreateProgram,
} from './academics.schemas.js';
import { AcademicsService } from './academics.service.js';

const optionalId = z.uuid().optional();

@Controller()
export class AcademicsController {
  constructor(private readonly academics: AcademicsService) {}

  @Get('faculties')
  @Can(AccessPolicy, 'viewStructure')
  listFaculties() {
    return this.academics.listFaculties();
  }

  @Post('faculties')
  @Can(AccessPolicy, 'manageStructure')
  createFaculty(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createFacultySchema }) body: CreateFaculty,
  ) {
    return this.academics.createFaculty(actor, body);
  }

  @Get('departments')
  @Can(AccessPolicy, 'viewStructure')
  listDepartments(
    @Query('facultyId', { schema: optionalId }) facultyId?: string,
  ) {
    return this.academics.listDepartments(facultyId);
  }

  @Post('departments')
  @Can(AccessPolicy, 'manageStructure')
  createDepartment(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createDepartmentSchema }) body: CreateDepartment,
  ) {
    return this.academics.createDepartment(actor, body);
  }

  @Get('programs')
  @Can(AccessPolicy, 'viewStructure')
  listPrograms(
    @Query('departmentId', { schema: optionalId }) departmentId?: string,
  ) {
    return this.academics.listPrograms(departmentId);
  }

  @Post('programs')
  @Can(AccessPolicy, 'manageStructure')
  createProgram(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createProgramSchema }) body: CreateProgram,
  ) {
    return this.academics.createProgram(actor, body);
  }
}
