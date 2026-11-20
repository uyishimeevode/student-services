import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../common/auth-user.js';
import { mapPrismaError } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateDepartment,
  CreateFaculty,
  CreateProgram,
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
}
