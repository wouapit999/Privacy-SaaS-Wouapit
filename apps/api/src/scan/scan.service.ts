import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DiscoveredResultDTO } from '@ppm/shared';

import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from '../identity/identity.service';
import { ScanQueue } from './scan.queue';

@Injectable()
export class ScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
    private readonly queue: ScanQueue,
  ) {}

  /**
   * Enqueues a scan. Hard gate: the target identity must belong to the caller
   * AND be verified. Unverified identities cannot be scanned.
   */
  async start(userId: string, identityId: string) {
    const identity = await this.identity.ownedOrThrow(userId, identityId);
    if (!identity.verifiedAt) {
      throw new BadRequestException(
        'Identity is not verified. Prove ownership before scanning.',
      );
    }

    const job = await this.prisma.scanJob.create({
      data: { userId, identityId, status: 'QUEUED' },
    });
    await this.queue.add({ scanJobId: job.id, userId, identityId });
    return { scanId: job.id, status: job.status };
  }

  async results(userId: string, scanId: string): Promise<{
    scanId: string;
    status: string;
    results: DiscoveredResultDTO[];
  }> {
    const job = await this.prisma.scanJob.findFirst({
      where: { id: scanId, userId },
      include: { results: { orderBy: { confidence: 'desc' } } },
    });
    if (!job) throw new BadRequestException('Scan not found.');

    return {
      scanId: job.id,
      status: job.status,
      results: job.results.map((r) => ({
        id: r.id,
        url: r.url,
        title: r.title,
        source: r.source,
        kind: 'PROFILE',
        confidence: r.confidence,
        discoveredAt: r.discoveredAt.toISOString(),
      })),
    };
  }
}
