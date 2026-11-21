import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus } from '../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../common/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';
import type {
  Apply,
  ListApplications,
  ReviewApplication,
} from './admissions.schemas.js';

const APPLICATION_INCLUDE = {
  program: { select: { id: true, code: true, name: true } },
  reviewedBy: { select: { fullName: true } },
  student: { select: { id: true, registrationNumber: true } },
} as const;

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly audit: AuditService,
  ) {}

  /** Programmes an applicant can choose from on the public form. */
  programs() {
    return this.prisma.program.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        durationYears: true,
        department: { select: { name: true } },
      },
    });
  }

  /** Public: anyone can apply. The answer reveals nothing about other applications. */
  async apply(input: Apply) {
    const program = await this.prisma.program.findUnique({
      where: { id: input.programId },
    });
    if (!program)
      throw new BadRequestException('Choose a programme from the list');
    const application = await this.prisma.$transaction(async (tx) => {
      const created = await tx.application.create({ data: input });
      await this.audit.record(
        {
          actorId: null,
          action: 'application.submit',
          entity: 'application',
          entityId: created.id,
        },
        tx,
      );
      return created;
    });
    return {
      reference: application.id.slice(0, 8).toUpperCase(),
      status: application.status,
    };
  }

  list(query: ListApplications) {
    return this.prisma.application.findMany({
      where: {
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: APPLICATION_INCLUDE,
    });
  }

  async findOne(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: APPLICATION_INCLUDE,
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  async review(actor: AuthUser, id: string, input: ReviewApplication) {
    const current = await this.findOne(id);
    if (current.status === ApplicationStatus.ENROLLED)
      throw new BadRequestException('This applicant is already enrolled');
    const verified = input.documentsVerified ?? current.documentsVerified;
    if (input.status === ApplicationStatus.OFFERED && !verified) {
      throw new BadRequestException(
        'Verify the documents before issuing an offer',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { ...input, reviewedById: actor.id },
        include: APPLICATION_INCLUDE,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'application.review',
          entity: 'application',
          entityId: id,
          details: input,
        },
        tx,
      );
      return updated;
    });
  }

  /** Converts an offered applicant into a registered student with a sign-in account. */
  async enroll(actor: AuthUser, id: string) {
    const application = await this.findOne(id);
    if (application.status !== ApplicationStatus.OFFERED) {
      throw new BadRequestException(
        'Only applicants with an offer can be enrolled',
      );
    }
    const result = await this.students.register(actor, {
      firstName: application.firstName,
      lastName: application.lastName,
      gender: application.gender,
      dateOfBirth: application.dateOfBirth,
      phone: application.phone,
      email: application.email,
      programId: application.programId,
      intakeYear: application.intakeYear,
      yearOfStudy: 1,
    });
    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.ENROLLED,
        studentId: result!.student.id,
        reviewedById: actor.id,
      },
      include: APPLICATION_INCLUDE,
    });
    return {
      application: updated,
      student: result!.student,
      temporaryPassword: result!.temporaryPassword,
    };
  }
}
