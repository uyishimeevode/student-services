import { ExamsService } from './exams.service.js';

function setup(
  invoices: {
    amount: number;
    waiverAmount: number;
    payments: { amount: number; status: string }[];
  }[],
  modules = 2,
) {
  const student = {
    id: 's1',
    registrationNumber: '202600001',
    firstName: 'Aline',
    lastName: 'Uwase',
    status: 'ACTIVE',
  };
  const prisma = {
    student: { findUniqueOrThrow: vi.fn().mockResolvedValue(student) },
    academicTerm: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 't1', name: '2026/2027 Semester 1' }),
    },
    invoice: { findMany: vi.fn().mockResolvedValue(invoices) },
    enrollment: {
      findMany: vi.fn().mockResolvedValue(
        Array.from({ length: modules }, (_, i) => ({
          offering: { course: { code: `C${i}`, title: 'T', credits: 3 } },
        })),
      ),
    },
  };
  const students = {
    requireOwnRecord: vi.fn().mockResolvedValue({ id: 's1' }),
  };
  const config = {
    get: vi.fn().mockReturnValue('test-secret-that-is-at-least-32-bytes'),
  };
  const service = new ExamsService(
    prisma as never,
    students as never,
    {} as never,
    config as never,
  );
  return service.myDocuments({ id: 'u1' } as never);
}

describe('ExamsService.myDocuments', () => {
  it('issues no card while less than half the fees are paid', async () => {
    const docs = await setup([
      {
        amount: 1000,
        waiverAmount: 0,
        payments: [{ amount: 400, status: 'VERIFIED' }],
      },
    ]);
    expect(docs.cat?.issued).toBe(false);
    expect(docs.exam?.issued).toBe(false);
  });

  it('issues the CAT card at half paid but not the exam card', async () => {
    const docs = await setup([
      {
        amount: 1000,
        waiverAmount: 0,
        payments: [
          { amount: 500, status: 'VERIFIED' },
          { amount: 500, status: 'PENDING' },
        ],
      },
    ]);
    expect(docs.cat).toMatchObject({
      issued: true,
      number: 'CAT-202600001-20262027',
    });
    expect(docs.exam?.issued).toBe(false);
  });

  it('issues both cards when the balance is cleared, waivers included', async () => {
    const docs = await setup([
      {
        amount: 1000,
        waiverAmount: 300,
        payments: [{ amount: 700, status: 'VERIFIED' }],
      },
    ]);
    expect(docs.exam?.issued).toBe(true);
    expect(docs.cat?.issued && docs.cat.verificationCode).toMatch(
      /^[0-9A-F]{10}$/,
    );
  });

  it('refuses cards to a student with no registered modules', async () => {
    const docs = await setup([], 0);
    expect(docs.cat).toEqual({
      issued: false,
      reason: 'You have no registered modules this term',
    });
  });
});
