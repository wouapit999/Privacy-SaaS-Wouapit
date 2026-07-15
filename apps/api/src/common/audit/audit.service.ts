import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    userId?: string | null;
    action: string;
    target?: string | null;
    ip?: string | null;
    meta?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          target: params.target ?? null,
          ip: params.ip ?? null,
          meta: (params.meta as any) ?? undefined,
        },
      });
    } catch (err) {
      // Never let audit failures break the request path; surface for ops.
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
    }
  }
}
