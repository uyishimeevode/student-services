# Student Services

Team 8 (Karisimbi). A digital platform for student registration, records, academic information, school fees and student requests.

## Team

| Member | ID | Role |
| --- | --- | --- |
| Dieudonne Rokumu | 26015331 | Backend Engineer |
| Alexandre Muhizi | 260910031 | Frontend Engineer |
| Nshimiyimana Jean D'Amour | 26016569 | System Architect |
| Tuyishime Evode | 26057497 | DevOps Engineer |
| Ishimwe Thierry | 25053189 | QA Tester |
| Ingabire Ernestine | 25093887 | |

## Stack

- API: NestJS 12 (ESM), Prisma 7, PostgreSQL 17, `@nestjs/authentication` (JWT bearer) and `@nestjs/authorization` (policies), Zod validation, Vitest
- Web: React 19, React Router 7, Vite 8
- DevOps: Docker, Docker Compose, Nginx, GitHub Actions

## Structure

```
apps/
  api/                 NestJS API
    prisma/            schema.prisma and migrations
    src/
      auth/            sign-in, current user, change password
      users/           staff accounts and roles (System Administrator)
      academics/       faculties, departments, programmes
      students/        registration and student records
      audit/           audit log
      common/          permissions, access policy, shared helpers
      health/          liveness and readiness checks
      database/seed.ts first admin and starter structure
  web/                 React app
docker-compose.yml     PostgreSQL + API + web
.github/workflows/     CI
```

## Roles and modules

| Access group | Role | What they can do |
| --- | --- | --- |
| Student Access | Student | Register courses, see approved grades and GPA, view materials, see fees and record payments, submit requests |
| Academic Delivery | Lecturer | Class lists, attendance, enter and submit grades, share materials |
| Academic Delivery | Head of Department | Course catalogue and lecturer assignment for their department, approve or return grades, department students and reports, teach |
| Academic Delivery | Dean | Faculty students, department performance reports, CSV export |
| Student Operations | Admissions Officer | Review applications, verify documents, issue offers, enrol applicants as students, register students |
| Student Operations | Registrar | Academic terms and course registration window, official records and status, transcripts, courses, service requests, reports |
| Student Operations | Finance Officer | Bill a student or a whole class, verify or reject payments, waivers, collection report |
| Student Operations | Student Services Officer | Triage and resolve requests, issue letters, book appointments, transcripts |
| System Control | System Administrator | Users and roles, academic structure, audit log |

Applicants apply without an account at `/apply`. Permissions are defined in `apps/api/src/common/permissions.ts`.

## Demo data

`npm run db:seed:demo` (in `apps/api`) adds one account per role, two terms, courses, classes, students with grades and attendance, invoices and payments, requests and applications. Every demo account uses the password `Demo1234!`:

`registrar@demo.rw`, `admissions@demo.rw`, `finance@demo.rw`, `services@demo.rw`, `hod@demo.rw`, `dean@demo.rw`, `lecturer@demo.rw`, `lecturer2@demo.rw`, `student@demo.rw`

Do not run the demo seed on a production database.

## Run locally

Requirements: Node.js 22, PostgreSQL 17 (or Docker).

```bash
# 1. Database only, from the repo root
docker compose up -d db

# 2. API
cd apps/api
cp .env.example .env              # set JWT_SECRET (openssl rand -base64 32)
npm install                       # runs prisma generate
npx prisma migrate deploy        # applies every migration in prisma/migrations
npm run db:seed:demo              # admin, structure and demo data; use db:seed for admin only
npm run start:dev                 # http://localhost:3000

# 3. Web, in another terminal
cd apps/web
npm install
npm run dev                       # http://localhost:5173
```

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `apps/api/.env`. The first sign-in asks for a new password.

## Run everything with Docker

```bash
cp .env.example .env              # set JWT_SECRET
docker compose up -d --build
docker compose exec api npm run db:seed:prod
```

Web: http://localhost:8080. API: http://localhost:3000. The API applies pending migrations on start.

## API

All routes except sign-in, health and the public admissions routes need `Authorization: Bearer <token>`.

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/sign-in`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Dashboard | `GET /api/dashboard` (sections depend on role) |
| Users | `GET, POST /api/users`, `GET, PATCH /api/users/:id`, `POST /api/users/:id/reset-password` |
| Structure | `GET, POST /api/faculties`, `/api/departments`, `/api/programs`, `/api/courses` |
| Terms | `GET, POST /api/terms`, `GET /api/terms/current`, `PATCH /api/terms/:id` |
| Students | `GET, POST /api/students`, `GET /api/students/me`, `GET, PATCH /api/students/:id`, `PATCH /api/students/:id/status`, `GET /api/students/:id/transcript` |
| Classes | `GET, POST /api/offerings`, `GET /api/offerings/lecturers`, `PATCH /api/offerings/:id/lecturer` |
| Teaching | `GET /api/teaching/classes`, `GET /api/teaching/classes/:id`, `POST .../attendance`, `PUT .../grades`, `POST, DELETE .../materials` |
| Grade approval | `GET /api/grade-approvals`, `POST /api/grade-approvals/:offeringId` |
| Student portal | `GET, POST /api/my/courses`, `DELETE /api/my/courses/:enrollmentId`, `GET /api/my/grades`, `GET /api/my/materials`, `GET /api/my/fees`, `POST /api/my/fees/:invoiceId/payments`, `GET, POST /api/my/requests` |
| Finance | `GET, POST /api/finance/invoices`, `PATCH /api/finance/invoices/:id/waiver`, `GET /api/finance/payments`, `PATCH /api/finance/payments/:id`, `GET /api/finance/report` |
| Requests | `GET /api/requests`, `GET, PATCH /api/requests/:id` |
| Admissions | `GET /api/public/programs`, `POST /api/public/applications`, `GET /api/applications`, `GET, PATCH /api/applications/:id`, `POST /api/applications/:id/enroll` |
| Reports | `GET /api/reports/overview`, `GET /api/reports/students.csv` |
| Audit | `GET /api/audit-logs` |
| Health | `GET /health`, `GET /health/ready` |

Grades: A 80 and above, B 70, C 60, D 50, F below 50; GPA on a 4-point scale weighted by credits. Students only see grades after the Head of Department approves them. Amounts are whole Rwandan francs.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and `develop` and on pull requests:

1. API: lint, type check, unit tests, e2e tests, `prisma migrate deploy` and seed against PostgreSQL, build
2. Web: lint, build
3. Docker: builds both images

## Working on the repo

- Branch from `develop`: `feature/<module>-<what>`, `fix/<module>-<what>`, `chore/<what>`
- Commits: `type(scope): summary`, e.g. `feat(students): add status change endpoint`
- Open a pull request into `develop`; CI must pass before merge
