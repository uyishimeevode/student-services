import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestStatus } from '../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../common/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';
import type {
  ListRequests,
  SubmitRequest,
  UpdateRequest,
} from './requests.schemas.js';

const REQUEST_INCLUDE = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      registrationNumber: true,
      program: { select: { code: true } },
    },
  },
  assignedTo: { select: { id: true, fullName: true } },
} as const;

const CLOSED: RequestStatus[] = [
  RequestStatus.RESOLVED,
  RequestStatus.REJECTED,
];

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly audit: AuditService,
  ) {}

  async submit(actor: AuthUser, input: SubmitRequest) {
    const student = await this.students.requireOwnRecord(actor);
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({
        data: { ...input, studentId: student.id },
        include: REQUEST_INCLUDE,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'request.submit',
          entity: 'request',
          entityId: request.id,
          details: { type: input.type },
        },
        tx,
      );
      return request;
    });
  }

  async mine(actor: AuthUser) {
    const student = await this.students.requireOwnRecord(actor);
    return this.prisma.serviceRequest.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      include: REQUEST_INCLUDE,
    });
  }

  list(actor: AuthUser, query: ListRequests) {
    return this.prisma.serviceRequest.findMany({
      where: {
        status: query.status,
        type: query.type,
        ...(query.assigned === 'me' ? { assignedToId: actor.id } : {}),
        ...(query.assigned === 'unassigned' ? { assignedToId: null } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 200,
      include: REQUEST_INCLUDE,
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async update(actor: AuthUser, id: string, input: UpdateRequest) {
    const current = await this.findOne(id);
    if (CLOSED.includes(current.status) && !input.status) {
      throw new BadRequestException('Reopen the request before changing it');
    }
    if (
      input.status &&
      CLOSED.includes(input.status) &&
      !(input.response ?? current.response)
    ) {
      throw new BadRequestException(
        'Write a response to the student before closing the request',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceRequest.update({
        where: { id },
        data: {
          status:
            input.status ??
            (input.assignToMe && current.status === RequestStatus.OPEN
              ? RequestStatus.IN_PROGRESS
              : undefined),
          assignedToId: input.assignToMe ? actor.id : undefined,
          response: input.response,
          appointmentAt: input.appointmentAt,
        },
        include: REQUEST_INCLUDE,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'request.update',
          entity: 'request',
          entityId: id,
          details: {
            status: updated.status,
            assigned: input.assignToMe ? actor.fullName : undefined,
          },
        },
        tx,
      );
      return updated;
    });
  }
}
