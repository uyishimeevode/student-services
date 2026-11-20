import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationModule, type Duration } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { AcademicsModule } from './academics/academics.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AccessPolicy } from './common/access.policy.js';
import { validateEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StudentsModule } from './students/students.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Authentication must come before authorization: its guard sets the user the policies read.
    AuthenticationModule.forRoot({
      accessToken: {
        key: process.env.JWT_SECRET ?? '',
        ttl: (process.env.JWT_TTL ?? '8h') as Duration,
      },
      refreshToken: false,
    }),
    AuthorizationModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    AcademicsModule,
    StudentsModule,
  ],
  controllers: [HealthController],
  providers: [AccessPolicy],
})
export class AppModule {}
