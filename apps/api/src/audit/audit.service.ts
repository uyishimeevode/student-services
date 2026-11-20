import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const auditQuerySchema = z.object({
  entity: z.string().trim().min(1).optional(),
  actorId: z.uuid().optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records an action. Pass a transaction client to keep the log in the same transaction as the change. */
  async record(
    entry: AuditEntry,
    client: Pick<Prisma.TransactionClient, 'auditLog'> = this.prisma,
  ) {
    await client.auditLog.create({ data: entry });
  }

  async list(query: AuditQuery) {
    const rows = await this.prisma.auditLog.findMany({
      where: { entity: query.entity, actorId: query.actorId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        actor: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }
}
