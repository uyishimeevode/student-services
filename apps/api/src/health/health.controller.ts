import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { PrismaService } from '../prisma/prisma.service.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up. */
  @Get()
  live() {
    return { status: 'ok' };
  }

  /** Readiness: the database answers. Used by Docker and the deployment platform. */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
  }
}
