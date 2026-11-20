import { ConflictException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import type { AuthUser } from '../common/auth-user.js';
import { StudentsService } from './students.service.js';

const registrar: AuthUser = {
  id: 'registrar-1',
  email: 'registrar@test.local',
  fullName: 'Registrar',
  role: Role.REGISTRAR,
  isActive: true,
  mustChangePassword: false,
  departmentId: null,
  facultyId: null,
};

function setup() {
  const tx = {
    student: {
      create: vi
        .fn()
        .mockResolvedValue({ id: 's1', intakeYear: 2026, sequence: 7 }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 's1',
          sequence: 7,
          registrationNumber: data.registrationNumber,
          userId: 'u-s1',
        }),
      ),
    },
  };
  const prisma = {
    $transaction: vi
      .fn()
      .mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
    student: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const credentials = { hash: vi.fn().mockResolvedValue('hashed') };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const authorization = { authorize: vi.fn() };
  const service = new StudentsService(
    prisma as never,
    credentials as never,
    audit as never,
    authorization as never,
  );
  return { service, prisma, tx, credentials, audit };
}

const input = {
  firstName: 'Aline',
  lastName: 'Uwase',
  gender: 'FEMALE' as const,
  dateOfBirth: new Date('2004-03-10T00:00:00.000Z'),
  phone: '+250788000000',
  email: 'aline@test.local',
  programId: '0b8f5f1e-2a4c-4d5e-9f00-000000000001',
  intakeYear: 2026,
  yearOfStudy: 1,
};

describe('StudentsService.register', () => {
  it('creates the login and the record, assigns the registration number and audits it', async () => {
    const { service, tx, audit, credentials } = setup();

    const result = await service.register(registrar, input);

    expect(credentials.hash).toHaveBeenCalledWith(result!.temporaryPassword);
    const created = tx.student.create.mock.calls[0][0].data;
    expect(created.user.create).toMatchObject({
      email: 'aline@test.local',
      role: Role.STUDENT,
      mustChangePassword: true,
    });
    expect(created.program).toEqual({ connect: { id: input.programId } });
    expect(created).not.toHaveProperty('email');
    expect(tx.student.update.mock.calls[0][0].data).toEqual({
      registrationNumber: '202600007',
    });
    expect(result!.student).not.toHaveProperty('sequence');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'registrar-1',
        action: 'student.register',
        entityId: 's1',
      }),
      tx,
    );
  });

  it('answers 409 when the email is already used', async () => {
    const { service, tx } = setup();
    tx.student.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.register(registrar, input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('StudentsService.list', () => {
  it('limits a Head of Department to their department', async () => {
    const { service, prisma } = setup();
    await service.list(
      { ...registrar, role: Role.HEAD_OF_DEPARTMENT, departmentId: 'dep-it' },
      { limit: 25 },
    );
    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.AND[0]).toEqual({ program: { departmentId: 'dep-it' } });
  });

  it('limits a Dean to their faculty', async () => {
    const { service, prisma } = setup();
    await service.list(
      { ...registrar, role: Role.DEAN, facultyId: 'fac-cit' },
      { limit: 25 },
    );
    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.AND[0]).toEqual({
      program: { department: { facultyId: 'fac-cit' } },
    });
  });

  it('does not limit the Registrar', async () => {
    const { service, prisma } = setup();
    await service.list(registrar, { limit: 25 });
    expect(prisma.student.findMany.mock.calls[0][0].where.AND[0]).toEqual({});
  });
});
