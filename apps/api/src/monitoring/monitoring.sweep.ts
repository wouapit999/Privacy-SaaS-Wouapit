import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from '../identity/identity.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { ClassificationService } from '../ai/classification.service';
import { NotificationsService } from '../notifications/notifications.service';

const normalizeUrl = (u: string) => u.replace(/\/$/, '');

export interface SweepOutcome {
  identityId: string;
  newCount: number;
  removedCount: number;
}

/**
 * Re-runs discovery for one verified identity and diffs against what we already
 * stored, so scheduled monitoring surfaces *changes* rather than re-listing
 * everything:
 *   - a URL we now find but had not stored  → new mention (+ notification)
 *   - a stored URL we no longer find         → removed page (+ notification)
 */
@Injectable()
export class MonitoringSweep {
  private readonly logger = new Logger(MonitoringSweep.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
    private readonly discovery: DiscoveryService,
    private readonly notifications: NotificationsService,
    private readonly classification: ClassificationService,
  ) {}

  async sweepIdentity(userId: string, identityId: string): Promise<SweepOutcome> {
    const identity = await this.identity.ownedOrThrow(userId, identityId);
    if (!identity.verifiedAt) {
      return { identityId, newCount: 0, removedCount: 0 };
    }

    const value = this.identity.plaintext(identity);
    const hits = await this.discovery.discover({ type: identity.type, value });
    const foundUrls = new Set(hits.map((h) => normalizeUrl(h.url)));

    const existing = await this.prisma.discoveredProfile.findMany({
      where: { identityId, removedAt: null },
    });
    const existingUrls = new Set(existing.map((p) => normalizeUrl(p.url)));

    // New mentions.
    let newCount = 0;
    for (const hit of hits) {
      if (existingUrls.has(normalizeUrl(hit.url))) continue;
      const cls = await this.classification.classify({
        url: hit.url,
        title: hit.title,
        source: hit.source,
      });
      await this.prisma.discoveredProfile.create({
        data: {
          identityId,
          url: hit.url,
          title: hit.title,
          source: hit.source,
          kind: cls.kind,
          confidence: hit.confidence,
          tags: cls.tags,
          hasEmail: cls.hasEmail,
          hasPhone: cls.hasPhone,
          hasAddress: cls.hasAddress,
          riskScore: cls.riskScore,
        },
      });
      newCount++;
      await this.notifications.create({
        userId,
        type: 'new_mention',
        title: `New public mention of ${identity.displayValue}`,
        body: `Found on ${hit.source}: ${hit.url}`,
      });
    }

    // Removed pages.
    let removedCount = 0;
    for (const profile of existing) {
      if (foundUrls.has(normalizeUrl(profile.url))) continue;
      await this.prisma.discoveredProfile.update({
        where: { id: profile.id },
        data: { removedAt: new Date() },
      });
      removedCount++;
      await this.notifications.create({
        userId,
        type: 'removed_page',
        title: `A page about ${identity.displayValue} is gone`,
        body: `No longer found on ${profile.source}: ${profile.url}`,
      });
    }

    if (newCount || removedCount) {
      this.logger.log(
        `Sweep ${identityId}: +${newCount} new, -${removedCount} removed.`,
      );
    }
    return { identityId, newCount, removedCount };
  }

  /** Sweeps every verified identity across all users (the daily job). */
  async sweepAll(): Promise<void> {
    const identities = await this.prisma.verifiedIdentity.findMany({
      where: { verifiedAt: { not: null } },
      select: { id: true, userId: true },
    });
    for (const { id, userId } of identities) {
      try {
        await this.sweepIdentity(userId, id);
      } catch (err) {
        this.logger.error(`Sweep failed for ${id}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`Daily sweep complete over ${identities.length} identities.`);
  }
}
