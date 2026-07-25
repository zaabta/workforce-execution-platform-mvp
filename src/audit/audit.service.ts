import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecordInput {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Records critical business operations (SDD 12.6): Login, Create, Update,
 * Delete, Submit, Approve, Reject. Audit records are immutable -- this
 * service only ever inserts, never updates or deletes.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: input.oldValue as any,
        newValue: input.newValue as any,
      },
    });
  }
}
