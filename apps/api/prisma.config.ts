import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/database/seed.ts',
  },
  // Read without env(), which throws when the variable is missing. `prisma generate` runs during
  // image builds (npm ci, npm run build) where no database is configured; migrations run at start-up with it set.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
