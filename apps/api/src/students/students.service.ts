import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationService } from '@nestjs/authorization';
import type { Prisma } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import { CredentialsService } from '../auth/credentials.service.js';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import { mapPrismaError } from '../common/prisma-errors.js';
import { generateTemporaryPassword } from '../common/temporary-password.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { formatRegistrationNumber } from './registration-number.js';
import type {
  ChangeStatus,
  ListStudents,
  RegisterStudent,
  UpdateStudent,
} from './students.schemas.js';

const STUDENT_INCLUDE = {
  user: { select: { id: true, email: true, isActive: true } },
  program: {
    select: {
      id: true,
      code: true,
      name: true,
      durationYears: true,
      department: {
        select: { id: true, code: true, name: true, facultyId: true },
      },
    },
  },
} as const;

type StudentWithRelations = Prisma.StudentGetPayload<{
  include: typeof STUDENT_INCLUDE;
}>;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: CredentialsService,
    private readonly audit: AuditService,
    private readonly authorization: AuthorizationService,
  ) {}

  async register(actor: AuthUser, input: RegisterStudent) {
    const { email, programId, ...profile } = input;
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.credentials.hash(temporaryPassword);
    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const created = await tx.student.create({
          data: {
            ...profile,
            user: {
              create: {
                email,
                fullName: `${profile.firstName} ${profile.lastName}`,
                role: Role.STUDENT,
                passwordHash,
                mustChangePassword: true,
              },
            },
            program: { connect: { id: programId } },
          },
        });
        const registered = await tx.student.update({
          where: { id: created.id },
          data: {
            registrationNumber: formatRegistrationNumber(
              created.intakeYear,
              created.sequence,
            ),
          },
          include: STUDENT_INCLUDE,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'student.register',
            entity: 'student',
            entityId: registered.id,
            details: { registrationNumber: registered.registrationNumber },
          },
          tx,
        );
        return registered;
      });
      return { student: this.toResponse(student), temporaryPassword };
    } catch (error) {
      mapPrismaError(error, 'A user with this email already exists');
    }
  }

  async list(actor: AuthUser, query: ListStudents) {
    const where: Prisma.StudentWhereInput = {
      programId: query.programId,
      status: query.status,
      intakeYear: query.intakeYear,
      AND: [
        this.scopeFor(actor),
        query.search ? this.searchFilter(query.search) : {},
      ],
    };
    const rows = await this.prisma.student.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: STUDENT_INCLUDE,
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: items.map((s: StudentWithRelations) => this.toResponse(s)),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async findOne(actor: AuthUser, id: string) {
    const student = await this.load(id);
    await this.authorization.authorize(
      AccessPolicy,
      'viewStudent',
      actor,
      this.scopeOf(student),
    );
    return this.toResponse(student);
  }

  async findMine(actor: AuthUser) {
    const student = await this.prisma.student.findUnique({
      where: { userId: actor.id },
      include: STUDENT_INCLUDE,
    });
    if (!student)
      throw new NotFoundException(
        'No student record is linked to this account',
      );
    return this.toResponse(student);
  }

  /** The student record behind a signed-in student account; 404 when the account has none. */
  async requireOwnRecord(actor: AuthUser) {
    const student = await this.prisma.student.findUnique({
      where: { userId: actor.id },
      select: {
        id: true,
        programId: true,
        yearOfStudy: true,
        status: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!student)
      throw new NotFoundException(
        'No student record is linked to this account',
      );
    return student;
  }

  async update(actor: AuthUser, id: string, input: UpdateStudent) {
    const current = await this.load(id);
    const { programId, ...rest } = input;
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const student = await tx.student.update({
          where: { id },
          data: {
            ...rest,
            ...(programId ? { program: { connect: { id: programId } } } : {}),
          },
          include: STUDENT_INCLUDE,
        });
        if (input.firstName || input.lastName) {
          await tx.user.update({
            where: { id: student.userId },
            data: { fullName: `${student.firstName} ${student.lastName}` },
          });
        }
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'student.update',
            entity: 'student',
            entityId: id,
            details: {
              changed: Object.keys(input),
              previousProgramId: programId ? current.programId : undefined,
            },
          },
          tx,
        );
        return student;
      });
      return this.toResponse(updated);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async changeStatus(actor: AuthUser, id: string, input: ChangeStatus) {
    const current = await this.load(id);
    if (current.status === input.status) {
      throw new BadRequestException(`Student is already ${input.status}`);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id },
        data: { status: input.status },
        include: STUDENT_INCLUDE,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'student.change_status',
          entity: 'student',
          entityId: id,
          details: {
            from: current.status,
            to: input.status,
            reason: input.reason,
          },
        },
        tx,
      );
      return student;
    });
    return this.toResponse(updated);
  }

  private async load(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: STUDENT_INCLUDE,
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  /** Heads of Department list their department only, Deans their faculty; other permitted roles see everyone. */
  scopeFor(actor: AuthUser): Prisma.StudentWhereInput {
    if (actor.role === Role.HEAD_OF_DEPARTMENT)
      return { program: { departmentId: actor.departmentId ?? '' } };
    if (actor.role === Role.DEAN)
      return { program: { department: { facultyId: actor.facultyId ?? '' } } };
    return {};
  }

  private searchFilter(search: string): Prisma.StudentWhereInput {
    return {
      OR: [
        { registrationNumber: { contains: search } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ],
    };
  }

  private scopeOf(student: StudentWithRelations) {
    return {
      userId: student.userId,
      departmentId: student.program.department.id,
      facultyId: student.program.department.facultyId,
    };
  }

  private toResponse(student: StudentWithRelations) {
    const { sequence: _sequence, ...rest } = student;
    return rest;
  }
}
