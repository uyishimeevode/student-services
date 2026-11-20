# Student Services API

NestJS 12 + PostgreSQL + Prisma 7. See the root README for setup, roles and endpoints.

```bash
cp .env.example .env
npm install            # also runs prisma generate
npm run db:migrate     # first time: creates the initial migration
npm run db:seed
npm run start:dev      # http://localhost:3000
npm test && npm run test:e2e
```
