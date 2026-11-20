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

## Roles

| Access group | Role | Release 1 access |
| --- | --- | --- |
| Student Access | Student | Own record |
| Academic Delivery | Lecturer | Academic structure |
| Academic Delivery | Head of Department | Students in own department |
| Academic Delivery | Dean | Students in own faculty |
| Student Operations | Admissions Officer | Register and view students |
| Student Operations | Registrar | Register, view, update students, change status, manage structure |
| Student Operations | Finance Officer | View students |
| Student Operations | Student Services Officer | View students |
| System Control | System Administrator | Users, roles, structure, audit log |

Permissions are defined in `apps/api/src/common/permissions.ts`. Courses, grades, fees and requests add their permissions there in later releases.

## Run locally

Requirements: Node.js 22, PostgreSQL 17 (or Docker).

```bash
# 1. Database only, from the repo root
docker compose up -d db

# 2. API
cd apps/api
cp .env.example .env              # set JWT_SECRET (openssl rand -base64 32)
npm install                       # runs prisma generate
npx prisma migrate dev --name init_student_registration   # first time only
npm run db:seed
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

All routes except sign-in and health need `Authorization: Bearer <token>`.

| Method | Path | Who |
| --- | --- | --- |
| POST | /api/auth/sign-in | Public |
| GET | /api/auth/me | Signed in |
| GET | /api/dashboard | Signed in (sections depend on role) |
| POST | /api/auth/change-password | Signed in |
| GET, POST | /api/users | System Administrator |
| GET, PATCH | /api/users/:id | System Administrator |
| POST | /api/users/:id/reset-password | System Administrator |
| GET | /api/faculties, /api/departments, /api/programs | Staff and students |
| POST | /api/faculties, /api/departments, /api/programs | Registrar, System Administrator |
| POST | /api/students | Registrar, Admissions Officer |
| GET | /api/students | Staff with student access (scoped for HoD and Dean) |
| GET | /api/students/me | Student |
| GET | /api/students/:id | Staff with access, or the student |
| PATCH | /api/students/:id | Registrar |
| PATCH | /api/students/:id/status | Registrar |
| GET | /api/audit-logs | System Administrator |
| GET | /health, /health/ready | Public |

Registering a student creates the login and the record in one transaction, assigns a registration number (intake year + 5-digit sequence, e.g. `202600012`) and returns a one-time temporary password.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and `develop` and on pull requests:

1. API: lint, type check, unit tests, e2e tests, `prisma migrate deploy` and seed against PostgreSQL, build
2. Web: lint, build
3. Docker: builds both images

## Working on the repo

- Branch from `develop`: `feature/<module>-<what>`, `fix/<module>-<what>`, `chore/<what>`
- Commits: `type(scope): summary`, e.g. `feat(students): add status change endpoint`
- Open a pull request into `develop`; CI must pass before merge
