import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import { CredentialsService } from '../auth/credentials.service.js';
import { AUTH_USER_SELECT, type AuthUser } from '../common/auth-user.js';
import { mapPrismaError } from '../common/prisma-errors.js';
import { generateTemporaryPassword } from '../common/temporary-password.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateUser, ListUsers, UpdateUser } from './users.schemas.js';

const USER_SELECT = { ...AUTH_USER_SELECT, createdAt: true } as const;

/** Heads of Department need a department and Deans a faculty; other roles carry no scope. */
function checkScope(
  role: Role,
  departmentId?: string | null,
  facultyId?: string | null,
) {
  if (role === Role.HEAD_OF_DEPARTMENT && !departmentId) {
    throw new BadRequestException(
      'A Head of Department must be assigned to a department',
    );
  }
  if (role === Role.DEAN && !facultyId) {
    throw new BadRequestException('A Dean must be assigned to a faculty');
  }
  return {
    departmentId: role === Role.HEAD_OF_DEPARTMENT ? departmentId : null,
    facultyId: role === Role.DEAN ? facultyId : null,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: CredentialsService,
    private readonly audit: AuditService,
  ) {}

  async create(actor: AuthUser, input: CreateUser) {
    const scope = checkScope(input.role, input.departmentId, input.facultyId);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.credentials.hash(temporaryPassword);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            fullName: input.fullName,
            role: input.role,
            ...scope,
            passwordHash,
            mustChangePassword: true,
          },
          select: USER_SELECT,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'user.create',
            entity: 'user',
            entityId: created.id,
            details: { role: created.role },
          },
          tx,
        );
        return created;
      });
      return { user, temporaryPassword };
    } catch (error) {
      mapPrismaError(error, 'A user with this email already exists');
    }
  }

  async list(query: ListUsers) {
    const rows = await this.prisma.user.findMany({
      where: {
        role: query.role,
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: USER_SELECT,
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(actor: AuthUser, id: string, input: UpdateUser) {
    const current = await this.findOne(id);
    if (
      current.role === Role.STUDENT &&
      input.role &&
      input.role !== Role.STUDENT
    ) {
      throw new BadRequestException(
        'Student accounts cannot be given a staff role',
      );
    }
    if (
      id === actor.id &&
      (input.isActive === false || (input.role && input.role !== current.role))
    ) {
      throw new BadRequestException(
        'You cannot deactivate your own account or change your own role',
      );
    }
    const role = input.role ?? current.role;
    const scope =
      role === Role.STUDENT
        ? {}
        : checkScope(
            role,
            input.departmentId ?? current.departmentId,
            input.facultyId ?? current.facultyId,
          );
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id },
          data: {
            fullName: input.fullName,
            role: input.role,
            isActive: input.isActive,
            ...scope,
          },
          select: USER_SELECT,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: 'user.update',
            entity: 'user',
            entityId: id,
            details: input,
          },
          tx,
        );
        return updated;
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async resetPassword(actor: AuthUser, id: string) {
    await this.findOne(id);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.credentials.hash(temporaryPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'user.reset_password',
          entity: 'user',
          entityId: id,
        },
        tx,
      );
    });
    return { temporaryPassword };
  }
}
