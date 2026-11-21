import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { z } from 'zod';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import {
  assignLecturerSchema,
  attendanceSchema,
  createOfferingSchema,
  gradeDecisionSchema,
  gradesSchema,
  listOfferingsSchema,
  materialSchema,
  bookModulesSchema,
  type AssignLecturer,
  type CreateMaterial,
  type CreateOffering,
  type GradeDecision,
  type ListOfferings,
  type RecordAttendance,
  type BookModules,
  type SaveGrades,
} from './courses.schemas.js';
import { CoursesService } from './courses.service.js';

const idSchema = z.uuid();

/** Course offerings per term and lecturer assignment (Registrar, Head of Department). */
@Controller('offerings')
export class OfferingsController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @Can(AccessPolicy, 'manageOfferings')
  list(
    @CurrentUser() actor: AuthUser,
    @Query({ schema: listOfferingsSchema }) query: ListOfferings,
  ) {
    return this.courses.listOfferings(actor, query);
  }

  @Get('lecturers')
  @Can(AccessPolicy, 'manageOfferings')
  lecturers() {
    return this.courses.listLecturers();
  }

  @Post()
  @Can(AccessPolicy, 'manageOfferings')
  create(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createOfferingSchema }) body: CreateOffering,
  ) {
    return this.courses.createOffering(actor, body);
  }

  @Patch(':id/lecturer')
  @Can(AccessPolicy, 'manageOfferings')
  assign(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: assignLecturerSchema }) body: AssignLecturer,
  ) {
    return this.courses.assignLecturer(actor, id, body);
  }
}

/** A student's own courses, results and materials. */
@Controller('my')
export class MyCoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('courses')
  @Can(AccessPolicy, 'registerCourses')
  list(@CurrentUser() actor: AuthUser) {
    return this.courses.myCourses(actor);
  }

  @Post('courses/book')
  @Can(AccessPolicy, 'registerCourses')
  book(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: bookModulesSchema }) body: BookModules,
  ) {
    return this.courses.bookModules(actor, body.offeringIds);
  }

  @Post('courses/:enrollmentId/invoice')
  @Can(AccessPolicy, 'registerCourses')
  @HttpCode(200)
  invoice(
    @CurrentUser() actor: AuthUser,
    @Param('enrollmentId', { schema: idSchema }) id: string,
  ) {
    return this.courses.moduleInvoice(actor, id);
  }

  @Post('courses/:enrollmentId/register')
  @Can(AccessPolicy, 'registerCourses')
  @HttpCode(200)
  register(
    @CurrentUser() actor: AuthUser,
    @Param('enrollmentId', { schema: idSchema }) id: string,
  ) {
    return this.courses.registerModule(actor, id);
  }

  @Delete('courses/:enrollmentId')
  @Can(AccessPolicy, 'registerCourses')
  @HttpCode(204)
  drop(
    @CurrentUser() actor: AuthUser,
    @Param('enrollmentId', { schema: idSchema }) id: string,
  ) {
    return this.courses.dropModule(actor, id);
  }

  @Get('grades')
  @Can(AccessPolicy, 'registerCourses')
  grades(@CurrentUser() actor: AuthUser) {
    return this.courses.myGrades(actor);
  }

  @Get('materials')
  @Can(AccessPolicy, 'registerCourses')
  materials(@CurrentUser() actor: AuthUser) {
    return this.courses.myMaterials(actor);
  }
}

/** A lecturer's classes: class list, attendance, grades and materials. */
@Controller('teaching/classes')
export class TeachingController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @Can(AccessPolicy, 'teach')
  list(@CurrentUser() actor: AuthUser) {
    return this.courses.myClasses(actor);
  }

  @Get(':id')
  @Can.Anyone()
  detail(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
  ) {
    return this.courses.classDetail(actor, id);
  }

  @Post(':id/attendance')
  @Can(AccessPolicy, 'teach')
  attendance(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: attendanceSchema }) body: RecordAttendance,
  ) {
    return this.courses.recordAttendance(actor, id, body);
  }

  @Put(':id/grades')
  @Can(AccessPolicy, 'teach')
  grades(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: gradesSchema }) body: SaveGrades,
  ) {
    return this.courses.saveGrades(actor, id, body);
  }

  @Post(':id/materials')
  @Can(AccessPolicy, 'teach')
  addMaterial(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: materialSchema }) body: CreateMaterial,
  ) {
    return this.courses.addMaterial(actor, id, body);
  }

  @Delete(':id/materials/:materialId')
  @Can(AccessPolicy, 'teach')
  @HttpCode(204)
  removeMaterial(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Param('materialId', { schema: idSchema }) materialId: string,
  ) {
    return this.courses.removeMaterial(actor, id, materialId);
  }
}

/** Grade approval by the Head of Department, and official transcripts. */
@Controller()
export class ResultsController {
  constructor(private readonly courses: CoursesService) {}

  @Get('grade-approvals')
  @Can(AccessPolicy, 'approveGrades')
  pending(@CurrentUser() actor: AuthUser) {
    return this.courses.pendingApprovals(actor);
  }

  @Post('grade-approvals/:offeringId')
  @Can(AccessPolicy, 'approveGrades')
  @HttpCode(200)
  decide(
    @CurrentUser() actor: AuthUser,
    @Param('offeringId', { schema: idSchema }) id: string,
    @Body({ schema: gradeDecisionSchema }) body: GradeDecision,
  ) {
    return this.courses.decideGrades(actor, id, body);
  }

  @Get('students/:id/transcript')
  @Can(AccessPolicy, 'viewTranscripts')
  transcript(@Param('id', { schema: idSchema }) id: string) {
    return this.courses.transcript(id);
  }
}
