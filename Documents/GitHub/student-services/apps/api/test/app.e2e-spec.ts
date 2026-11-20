import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import type { App } from 'supertest/types.js';

// Boots the whole app (guards, policies, validation, routing) with an in-memory stand-in for PostgreSQL.
process.env.DATABASE_URL ??=
  'postgresql://student:student@localhost:5432/student_services_test';
process.env.JWT_SECRET ??= 'e2e-secret-that-is-at-least-32-bytes-long';

const { AppModule } = await import('../src/app.module.js');
const { PrismaService } = await import('../src/prisma/prisma.service.js');

const hasher = new PasswordHasher({ logN: 10 });
const PASSWORD = 'Passw0rd!x';

interface FakeUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  departmentId: string | null;
  facultyId: string | null;
  passwordHash: string;
}

async function makeUsers(): Promise<FakeUser[]> {
  const passwordHash = await hasher.hash(PASSWORD);
  const base = {
    isActive: true,
    mustChangePassword: false,
    departmentId: null,
    facultyId: null,
    passwordHash,
  };
  return [
    {
      ...base,
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@test.local',
      fullName: 'Admin',
      role: 'SYSTEM_ADMINISTRATOR',
    },
    {
      ...base,
      id: '22222222-2222-4222-8222-222222222222',
      email: 'registrar@test.local',
      fullName: 'Registrar',
      role: 'REGISTRAR',
    },
    {
      ...base,
      id: '33333333-3333-4333-8333-333333333333',
      email: 'gone@test.local',
      fullName: 'Gone',
      role: 'REGISTRAR',
      isActive: false,
    },
  ];
}

function fakePrisma(users: FakeUser[]) {
  const pick = (
    user: FakeUser | undefined,
    select?: Record<string, boolean>,
  ) => {
    if (!user) return null;
    if (!select) return user;
    return Object.fromEntries(
      Object.keys(select).map((key) => [key, user[key as keyof FakeUser]]),
    );
  };
  const fake = {
    user: {
      findUnique: async ({
        where,
        select,
      }: {
        where: { id?: string; email?: string };
        select?: Record<string, boolean>;
      }) =>
        pick(
          users.find((u) =>
            where.id ? u.id === where.id : u.email === where.email,
          ),
          select,
        ),
      findMany: async () => users.map(({ passwordHash: _hash, ...u }) => u),
      update: async () => ({}),
    },
    student: { findMany: async () => [], findUnique: async () => null },
    auditLog: { create: async () => ({}), findMany: async () => [] },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(fake),
    $queryRaw: async () => [{ '?column?': 1 }],
    $disconnect: async () => undefined,
  };
  return fake;
}

describe('Student Services API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const users = await makeUsers();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma(users))
      .overrideProvider(PasswordHasher)
      .useValue(hasher)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] });
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function signIn(email: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({ email, password: PASSWORD });
    expect(res.status).toBe(200);
    return res.body.accessToken as string;
  }

  it('GET /health is public', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('rejects calls without a token', async () => {
    await request(app.getHttpServer()).get('/api/students').expect(401);
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rejects a wrong password and an unknown email the same way', async () => {
    const wrong = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({ email: 'admin@test.local', password: 'nope' });
    const unknown = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({ email: 'nobody@test.local', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('rejects an inactive account', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({ email: 'gone@test.local', password: PASSWORD })
      .expect(401);
  });

  it('validates the sign-in body', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('signs in and returns the profile with permissions', async () => {
    const token = await signIn('registrar@test.local');
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body).toMatchObject({
      email: 'registrar@test.local',
      role: 'REGISTRAR',
    });
    expect(me.body.permissions).toContain('students.register');
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('lets the System Administrator list users and forbids the Registrar', async () => {
    const admin = await signIn('admin@test.local');
    const registrar = await signIn('registrar@test.local');
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${registrar}`)
      .expect(403);
  });

  it('forbids the System Administrator from registering students', async () => {
    const admin = await signIn('admin@test.local');
    await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${admin}`)
      .send({})
      .expect(403);
  });

  it('validates the student registration body for the Registrar', async () => {
    const registrar = await signIn('registrar@test.local');
    const res = await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${registrar}`)
      .send({ firstName: 'Aline' })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('programId');
  });

  it('lets the Registrar list students', async () => {
    const registrar = await signIn('registrar@test.local');
    const res = await request(app.getHttpServer())
      .get('/api/students?limit=10')
      .set('Authorization', `Bearer ${registrar}`)
      .expect(200);
    expect(res.body).toEqual({ items: [], nextCursor: null });
  });
});
