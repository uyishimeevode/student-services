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
  createCourseSchema,
  createDepartmentSchema,
  createFacultySchema,
  createProgramSchema,
  createTermSchema,
  listCoursesSchema,
  updateTermSchema,
  type CreateCourse,
  type CreateDepartment,
  type CreateFaculty,
  type CreateProgram,
  type CreateTerm,
  type ListCourses,
  type UpdateTerm,
} from './academics.schemas.js';
import { AcademicsService } from './academics.service.js';

const optionalId = z.uuid().optional();
const idSchema = z.uuid();

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

  @Get('terms')
  @Can.Anyone()
  listTerms() {
    return this.academics.listTerms();
  }

  @Get('terms/current')
  @Can.Anyone()
  currentTerm() {
    return this.academics.currentTerm();
  }

  @Post('terms')
  @Can(AccessPolicy, 'manageTerms')
  createTerm(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createTermSchema }) body: CreateTerm,
  ) {
    return this.academics.createTerm(actor, body);
  }

  @Patch('terms/:id')
  @Can(AccessPolicy, 'manageTerms')
  updateTerm(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateTermSchema }) body: UpdateTerm,
  ) {
    return this.academics.updateTerm(actor, id, body);
  }

  @Get('courses')
  @Can(AccessPolicy, 'viewStructure')
  listCourses(
    @CurrentUser() actor: AuthUser,
    @Query({ schema: listCoursesSchema }) query: ListCourses,
  ) {
    return this.academics.listCourses(actor, query);
  }

  @Post('courses')
  @Can(AccessPolicy, 'manageCourses')
  createCourse(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createCourseSchema }) body: CreateCourse,
  ) {
    return this.academics.createCourse(actor, body);
  }
}
