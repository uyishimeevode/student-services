import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../common/auth-user.js';
import { mapPrismaError } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateCourse,
  CreateDepartment,
  CreateFaculty,
  CreateProgram,
  CreateTerm,
  ListCourses,
  UpdateTerm,
} from './academics.schemas.js';

@Injectable()
export class AcademicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listFaculties() {
    return this.prisma.faculty.findMany({ orderBy: { name: 'asc' } });
  }

  listDepartments(facultyId?: string) {
    return this.prisma.department.findMany({
      where: { facultyId },
      orderBy: { name: 'asc' },
      include: { faculty: { select: { id: true, code: true, name: true } } },
    });
  }

  listPrograms(departmentId?: string) {
    return this.prisma.program.findMany({
      where: { departmentId },
      orderBy: { name: 'asc' },
      include: {
        department: {
          select: { id: true, code: true, name: true, facultyId: true },
        },
      },
    });
  }

  async createFaculty(actor: AuthUser, input: CreateFaculty) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const faculty = await tx.faculty.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'faculty.create',
            entity: 'faculty',
            entityId: faculty.id,
          },
          tx,
        );
        return faculty;
      });
    } catch (error) {
      mapPrismaError(error, 'A faculty with this code or name already exists');
    }
  }

  async createDepartment(actor: AuthUser, input: CreateDepartment) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const department = await tx.department.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'department.create',
            entity: 'department',
            entityId: department.id,
          },
          tx,
        );
        return department;
      });
    } catch (error) {
      mapPrismaError(
        error,
        'A department with this code or name already exists',
      );
    }
  }

  async createProgram(actor: AuthUser, input: CreateProgram) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const program = await tx.program.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'program.create',
            entity: 'program',
            entityId: program.id,
          },
          tx,
        );
        return program;
      });
    } catch (error) {
      mapPrismaError(error, 'A programme with this code already exists');
    }
  }

  listTerms() {
    return this.prisma.academicTerm.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  /** The term marked current, or null when none is set yet. */
  currentTerm() {
    return this.prisma.academicTerm.findFirst({ where: { isCurrent: true } });
  }

  async createTerm(actor: AuthUser, input: CreateTerm) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const term = await tx.academicTerm.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'term.create',
            entity: 'term',
            entityId: term.id,
          },
          tx,
        );
        return term;
      });
    } catch (error) {
      mapPrismaError(error, 'A term with this name already exists');
    }
  }

  /** Only one term is current at a time; marking one current unmarks the others in the same transaction. */
  async updateTerm(actor: AuthUser, id: string, input: UpdateTerm) {
    const existing = await this.prisma.academicTerm.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Term not found');
    return this.prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.academicTerm.updateMany({
          where: { isCurrent: true, NOT: { id } },
          data: { isCurrent: false, registrationOpen: false },
        });
      }
      const term = await tx.academicTerm.update({ where: { id }, data: input });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'term.update',
          entity: 'term',
          entityId: id,
          details: input,
        },
        tx,
      );
      return term;
    });
  }

  /** Heads of Department see and manage courses of their own department only. */
  listCourses(actor: AuthUser, query: ListCourses) {
    return this.prisma.course.findMany({
      where: {
        programId: query.programId,
        yearLevel: query.yearLevel,
        ...(actor.role === Role.HEAD_OF_DEPARTMENT
          ? { program: { departmentId: actor.departmentId ?? '' } }
          : {}),
      },
      orderBy: [{ yearLevel: 'asc' }, { semester: 'asc' }, { code: 'asc' }],
      include: {
        program: {
          select: { id: true, code: true, name: true, departmentId: true },
        },
      },
    });
  }

  async createCourse(actor: AuthUser, input: CreateCourse) {
    if (actor.role === Role.HEAD_OF_DEPARTMENT) {
      const program = await this.prisma.program.findUnique({
        where: { id: input.programId },
      });
      if (!program || program.departmentId !== actor.departmentId) {
        throw new ForbiddenException(
          'You can only add courses to programmes in your department',
        );
      }
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const course = await tx.course.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'course.create',
            entity: 'course',
            entityId: course.id,
          },
          tx,
        );
        return course;
      });
    } catch (error) {
      mapPrismaError(error, 'A course with this code already exists');
    }
  }
}
