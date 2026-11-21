import 'dotenv/config';
import { PasswordHasher } from '@nestjs/authentication';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  ApplicationStatus,
  Gender,
  GradeStatus,
  PaymentMethod,
  PaymentStatus,
  RequestStatus,
  RequestType,
  Role,
} from '../generated/prisma/enums.js';
import { letterGrade } from '../courses/grading.js';
import { formatRegistrationNumber } from '../students/registration-number.js';

type Client = InstanceType<typeof PrismaClient>;

/**
 * Creates the first System Administrator and a starter academic structure.
 * With --demo it also adds one account per role, a current term, courses, classes,
 * students, fees, requests and applications so every dashboard has data.
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

    if (process.argv.includes('--demo')) await seedDemo(prisma, hasher);
    console.log(`Seed complete. Sign in as ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

const DEMO_PASSWORD = 'Demo1234!';

/** Deterministic pseudo-random numbers so the demo data is the same on every machine. */
function seeded(start: number) {
  let n = start;
  return () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };
}

async function seedDemo(prisma: Client, hasher: PasswordHasher) {
  if (await prisma.user.findUnique({ where: { email: 'registrar@demo.rw' } })) {
    console.log('Demo data already present, skipping.');
    return;
  }
  const random = seeded(42);
  const passwordHash = await hasher.hash(DEMO_PASSWORD);

  const fcit = await prisma.faculty.findUniqueOrThrow({
    where: { code: 'FCIT' },
  });
  const it = await prisma.department.findUniqueOrThrow({
    where: { code: 'IT' },
  });
  const bit = await prisma.program.findUniqueOrThrow({
    where: { code: 'BIT' },
  });
  const fbm = await prisma.faculty.create({
    data: { code: 'FBM', name: 'Faculty of Business and Management' },
  });
  const acc = await prisma.department.create({
    data: { code: 'ACC', name: 'Accounting and Finance', facultyId: fbm.id },
  });
  const baf = await prisma.program.create({
    data: {
      code: 'BAF',
      name: 'Bachelor of Accounting and Finance',
      durationYears: 3,
      departmentId: acc.id,
    },
  });

  const staff = async (
    email: string,
    fullName: string,
    role: Role,
    scope: { departmentId?: string; facultyId?: string } = {},
  ) =>
    prisma.user.create({
      data: { email, fullName, role, passwordHash, ...scope },
    });
  const lecturer = await staff(
    'lecturer@demo.rw',
    'Jean Bosco Habimana',
    Role.LECTURER,
  );
  const lecturer2 = await staff(
    'lecturer2@demo.rw',
    'Divine Ingabire',
    Role.LECTURER,
  );
  const hod = await staff(
    'hod@demo.rw',
    'Patrick Nshuti',
    Role.HEAD_OF_DEPARTMENT,
    { departmentId: it.id },
  );
  await staff('dean@demo.rw', 'Grace Uwimana', Role.DEAN, {
    facultyId: fcit.id,
  });
  const admissions = await staff(
    'admissions@demo.rw',
    'Eric Mugisha',
    Role.ADMISSIONS_OFFICER,
  );
  const registrar = await staff(
    'registrar@demo.rw',
    'Claudine Mukeshimana',
    Role.REGISTRAR,
  );
  await staff('finance@demo.rw', 'Olivier Ndayisaba', Role.FINANCE_OFFICER);
  const services = await staff(
    'services@demo.rw',
    'Alice Umutoni',
    Role.STUDENT_SERVICES_OFFICER,
  );

  const previous = await prisma.academicTerm.create({
    data: {
      name: '2025/2026 Semester 2',
      startDate: new Date('2026-02-02'),
      endDate: new Date('2026-06-26'),
    },
  });
  const current = await prisma.academicTerm.create({
    data: {
      name: '2026/2027 Semester 1',
      startDate: new Date('2026-09-14'),
      endDate: new Date('2027-01-29'),
      isCurrent: true,
      registrationOpen: true,
    },
  });

  const courseData = [
    ['BIT1101', 'Introduction to Programming', 4, 1, 1],
    ['BIT1102', 'Computer Systems Fundamentals', 3, 1, 1],
    ['BIT1103', 'Mathematics for Computing', 3, 1, 1],
    ['BIT1104', 'Communication Skills', 2, 1, 1],
    ['BIT2101', 'Database Systems', 4, 2, 1],
    ['BIT2102', 'Web Application Development', 4, 2, 1],
    ['BIT2103', 'Operating Systems', 3, 2, 1],
    ['BIT1201', 'Object-Oriented Programming', 4, 1, 2],
    ['BIT1202', 'Discrete Mathematics', 3, 1, 2],
  ] as const;
  const courses = new Map<
    string,
    { id: string; credits: number; yearLevel: number }
  >();
  for (const [code, title, credits, yearLevel, semester] of courseData) {
    const c = await prisma.course.create({
      data: { code, title, credits, yearLevel, semester, programId: bit.id },
    });
    courses.set(code, c);
  }
  await prisma.course.create({
    data: {
      code: 'BAF1101',
      title: 'Principles of Accounting',
      credits: 4,
      yearLevel: 1,
      semester: 1,
      programId: baf.id,
    },
  });

  // Current-term classes for year 1 and year 2; last term's classes for today's year 2 students.
  const offer = (
    code: string,
    termId: string,
    lecturerId: string | null,
    gradeStatus: GradeStatus = GradeStatus.DRAFT,
  ) =>
    prisma.courseOffering.create({
      data: {
        courseId: courses.get(code)!.id,
        termId,
        lecturerId,
        gradeStatus,
      },
    });
  const y1 = [
    await offer('BIT1101', current.id, lecturer.id),
    await offer('BIT1102', current.id, lecturer2.id),
    await offer('BIT1103', current.id, lecturer.id, GradeStatus.SUBMITTED),
    await offer('BIT1104', current.id, null),
  ];
  const y2 = [
    await offer('BIT2101', current.id, hod.id),
    await offer('BIT2102', current.id, lecturer.id),
    await offer('BIT2103', current.id, lecturer2.id),
  ];
  const past = [
    await offer('BIT1201', previous.id, lecturer.id, GradeStatus.APPROVED),
    await offer('BIT1202', previous.id, lecturer2.id, GradeStatus.APPROVED),
  ];

  const names = [
    ['Aline', 'Uwase', Gender.FEMALE],
    ['Jean', 'Niyonzima', Gender.MALE],
    ['Grace', 'Mukamana', Gender.FEMALE],
    ['Eric', 'Hakizimana', Gender.MALE],
    ['Diane', 'Iradukunda', Gender.FEMALE],
    ['Kevin', 'Manzi', Gender.MALE],
    ['Sandrine', 'Ishimwe', Gender.FEMALE],
    ['Yves', 'Bizimana', Gender.MALE],
    ['Clarisse', 'Uwamahoro', Gender.FEMALE],
    ['Fabrice', 'Nkurunziza', Gender.MALE],
    ['Josiane', 'Mutoni', Gender.FEMALE],
    ['Thierry', 'Gatete', Gender.MALE],
  ] as const;
  const students: { id: string; userId: string; yearOfStudy: number }[] = [];
  for (const [i, [firstName, lastName, gender]] of names.entries()) {
    const yearOfStudy = i < 7 ? 1 : 2;
    const intakeYear = yearOfStudy === 1 ? 2026 : 2025;
    const email =
      i === 0
        ? 'student@demo.rw'
        : `${firstName}.${lastName}@student.demo.rw`.toLowerCase();
    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        gender,
        dateOfBirth: new Date(Date.UTC(2003 + (i % 4), i % 12, 5 + i)),
        phone: `+2507880${String(10000 + i * 137).slice(0, 5)}`,
        address: 'Kigali',
        intakeYear,
        yearOfStudy,
        program: { connect: { id: bit.id } },
        user: {
          create: {
            email,
            fullName: `${firstName} ${lastName}`,
            role: Role.STUDENT,
            passwordHash,
          },
        },
      },
    });
    await prisma.student.update({
      where: { id: student.id },
      data: {
        registrationNumber: formatRegistrationNumber(
          intakeYear,
          student.sequence,
        ),
      },
    });
    students.push(student);
  }

  // Registrations, attendance and scores.
  for (const s of students) {
    const classes = s.yearOfStudy === 1 ? y1.slice(0, 3) : [...y2, ...past];
    for (const offering of classes) {
      const scored = offering.gradeStatus !== GradeStatus.DRAFT;
      const score = scored ? Math.round(45 + random() * 50) : null;
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: s.id,
          offeringId: offering.id,
          registeredAt: new Date(Date.UTC(2026, 8, 10)),
          score,
          grade: score === null ? null : letterGrade(score),
        },
      });
      if (offering.termId === current.id) {
        for (const day of [1, 8, 15]) {
          const date = new Date(Date.UTC(2026, 8, 14 + day));
          const session = await prisma.attendanceSession.upsert({
            where: { offeringId_date: { offeringId: offering.id, date } },
            create: {
              offeringId: offering.id,
              date,
              topic: `Week ${Math.ceil(day / 7)}`,
            },
            update: {},
          });
          await prisma.attendanceRecord.create({
            data: {
              sessionId: session.id,
              enrollmentId: enrollment.id,
              present: random() > 0.15,
            },
          });
        }
      }
    }
  }
  await prisma.courseMaterial.createMany({
    data: [
      {
        offeringId: y1[0]!.id,
        title: 'Course outline',
        url: 'https://example.com/bit1101/outline.pdf',
      },
      {
        offeringId: y1[0]!.id,
        title: 'Week 1 slides: variables and types',
        url: 'https://example.com/bit1101/week1',
      },
    ],
  });

  // Fees: tuition for everyone, some paid, some waiting for Finance to verify.
  for (const [i, s] of students.entries()) {
    const invoice = await prisma.invoice.create({
      data: {
        studentId: s.id,
        termId: current.id,
        description: 'Tuition fee, Semester 1',
        amount: 650_000,
        dueDate: new Date('2026-10-15'),
        ...(i === 5
          ? { waiverAmount: 200_000, waiverReason: 'Merit scholarship' }
          : {}),
      },
    });
    if (i % 3 === 1) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 650_000,
          method: PaymentMethod.BANK_TRANSFER,
          reference: `BK${100200 + i}`,
          status: PaymentStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      });
    } else if (i % 3 === 2 || i === 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 300_000,
          method: PaymentMethod.MOBILE_MONEY,
          reference: `MM${770300 + i}`,
        },
      });
    }
  }

  await prisma.serviceRequest.createMany({
    data: [
      {
        studentId: students[0]!.id,
        type: RequestType.LETTER,
        subject: 'Proof of enrolment letter',
        description:
          'I need a letter confirming I am a registered student for a bank account.',
      },
      {
        studentId: students[8]!.id,
        type: RequestType.TRANSCRIPT,
        subject: 'Transcript for internship',
        description: 'Please prepare my transcript for last semester.',
        status: RequestStatus.IN_PROGRESS,
        assignedToId: services.id,
      },
      {
        studentId: students[3]!.id,
        type: RequestType.APPOINTMENT,
        subject: 'Meeting about my fees',
        description: 'I would like to discuss a payment plan.',
        status: RequestStatus.IN_PROGRESS,
        assignedToId: services.id,
        appointmentAt: new Date(Date.now() + 3 * 86_400_000),
      },
      {
        studentId: students[5]!.id,
        type: RequestType.RECORD_CORRECTION,
        subject: 'Wrong date of birth',
        description: 'My date of birth is recorded incorrectly.',
        status: RequestStatus.RESOLVED,
        assignedToId: registrar.id,
        response: 'Corrected after checking your national ID.',
      },
    ],
  });

  const applicants = [
    ['Samuel', 'Mugabo', ApplicationStatus.SUBMITTED, false],
    ['Nadia', 'Umurerwa', ApplicationStatus.UNDER_REVIEW, true],
    ['Pacifique', 'Irakoze', ApplicationStatus.OFFERED, true],
    ['Belise', 'Uwera', ApplicationStatus.REJECTED, false],
  ] as const;
  for (const [
    i,
    [firstName, lastName, status, documentsVerified],
  ] of applicants.entries()) {
    await prisma.application.create({
      data: {
        firstName,
        lastName,
        email: `${firstName}.${lastName}@applicant.demo.rw`.toLowerCase(),
        phone: `+25078900${String(1000 + i)}`,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        dateOfBirth: new Date(Date.UTC(2007, i, 12)),
        previousSchool: 'Lycee de Kigali',
        programId: i === 3 ? baf.id : bit.id,
        intakeYear: 2027,
        status,
        documentsVerified,
        reviewedById:
          status === ApplicationStatus.SUBMITTED ? null : admissions.id,
        decisionNote:
          status === ApplicationStatus.REJECTED
            ? 'Minimum entry grades not met'
            : null,
      },
    });
  }

  console.log(
    `Demo data added. Every demo account uses the password ${DEMO_PASSWORD}:`,
  );
  console.log(
    '  registrar@demo.rw, admissions@demo.rw, finance@demo.rw, services@demo.rw,',
  );
  console.log(
    '  hod@demo.rw, dean@demo.rw, lecturer@demo.rw, lecturer2@demo.rw, student@demo.rw',
  );
}

await main();
