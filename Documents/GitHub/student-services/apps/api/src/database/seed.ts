import 'dotenv/config';
import { PasswordHasher } from '@nestjs/authentication';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';

/**
 * Creates the first System Administrator and a starter academic structure.
 * Safe to run more than once: existing rows are left as they are.
 */
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const hasher = new PasswordHasher();

  const email = (
    process.env.SEED_ADMIN_EMAIL ?? 'admin@studentservices.local'
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('SEED_ADMIN_PASSWORD is required');

  try {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        fullName: 'System Administrator',
        role: Role.SYSTEM_ADMINISTRATOR,
        passwordHash: await hasher.hash(password),
        mustChangePassword: true,
      },
    });

    const faculty = await prisma.faculty.upsert({
      where: { code: 'FCIT' },
      update: {},
      create: {
        code: 'FCIT',
        name: 'Faculty of Computing and Information Technology',
      },
    });
    const department = await prisma.department.upsert({
      where: { code: 'IT' },
      update: {},
      create: {
        code: 'IT',
        name: 'Information Technology',
        facultyId: faculty.id,
      },
    });
    await prisma.program.upsert({
      where: { code: 'BIT' },
      update: {},
      create: {
        code: 'BIT',
        name: 'BSc in Information Technology',
        durationYears: 4,
        departmentId: department.id,
      },
    });

    console.log(`Seed complete. Sign in as ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
