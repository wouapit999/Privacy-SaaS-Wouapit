import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from '../identity/identity.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { ClassificationService } from '../ai/classification.service';
import { SCAN_QUEUE, ScanJobData } from './scan.constants';

/**
 * BullMQ worker that executes a queued scan: re-checks ownership+verification,
 * runs the discovery engine, and persists results + classified profiles.
 */
@Injectable()
export class ScanProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScanProcessor.name);
  private worker?: Worker<ScanJobData>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
    private readonly discovery: DiscoveryService,
    private readonly classification: ClassificationService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<ScanJobData>(
      SCAN_QUEUE,
      (job) => this.handle(job),
      {
        connection: this.config.get('redis.connection')!,
        concurrency: 4,
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Scan ${job?.id} failed: ${err.message}`),
    );
  }

  private async handle(job: Job<ScanJobData>) {
    const { scanJobId, userId, identityId } = job.data;
    await this.prisma.scanJob.update({
      where: { id: scanJobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
      // Defense in depth: re-verify ownership at execution time.
      const identity = await this.identity.ownedOrThrow(userId, identityId);
      if (!identity.verifiedAt) throw new Error('Identity no longer verified.');

      const value = this.identity.plaintext(identity);
      const hits = await this.discovery.discover({ type: identity.type, value });

      for (const hit of hits) {
        const cls = await this.classification.classify({
          url: hit.url,
          title: hit.title,
          source: hit.source,
        });
        // Combine the connector's confidence with username-correlation strength.
        const correlation = this.classification.correlationConfidence(value, {
          url: hit.url,
          title: hit.title,
          source: hit.source,
        });
        const confidence = Math.round(((hit.confidence + correlation) / 2) * 100) / 100;

        const result = await this.prisma.scanResult.create({
          data: {
            scanJobId,
            url: hit.url,
            title: hit.title,
            source: hit.source,
            confidence,
          },
        });
        await this.prisma.discoveredProfile.create({
          data: {
            identityId,
            scanResultId: result.id,
            url: hit.url,
            title: hit.title,
            source: hit.source,
            kind: cls.kind,
            confidence,
            tags: cls.tags,
            hasEmail: cls.hasEmail,
            hasPhone: cls.hasPhone,
            hasAddress: cls.hasAddress,
            riskScore: cls.riskScore,
            verified: hit.verified ?? false,
            evidence: hit.evidence ?? null,
          },
        });
      }

      await this.prisma.scanJob.update({
        where: { id: scanJobId },
        data: { status: 'COMPLETED', finishedAt: new Date() },
      });
      this.logger.log(`Scan ${scanJobId} completed with ${hits.length} result(s).`);
    } catch (err) {
      await this.prisma.scanJob.update({
        where: { id: scanJobId },
        data: { status: 'FAILED', error: (err as Error).message, finishedAt: new Date() },
      });
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
