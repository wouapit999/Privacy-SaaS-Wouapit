import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { findingSeverity } from '../risk/severity';

/**
 * Read model for the per-finding review kit: every discovered profile the user
 * owns (confirmed + needs-review), each with its evidence snippet and a
 * deterministic severity, plus the ability to mark one as removed.
 */
@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const profiles = await this.prisma.discoveredProfile.findMany({
      where: { identity: { userId }, removedAt: null },
      orderBy: { discoveredAt: 'desc' },
      select: {
        id: true, url: true, title: true, source: true, kind: true,
        confidence: true, verified: true, evidence: true, discoveredAt: true,
        riskScore: true, hasEmail: true, hasPhone: true, hasAddress: true,
      },
    });

    return profiles.map((p) => {
      const { severity } = findingSeverity(p);
      return {
        id: p.id,
        url: p.url,
        title: p.title,
        source: p.source,
        kind: p.kind,
        confidence: p.confidence,
        verified: p.verified,
        evidence: p.evidence,
        severity,
        hasEmail: p.hasEmail,
        hasPhone: p.hasPhone,
        hasAddress: p.hasAddress,
        discoveredAt: p.discoveredAt.toISOString(),
      };
    });
  }

  /** Mark a finding removed (drops it from scores/lists). Ownership-checked. */
  async markRemoved(userId: string, id: string) {
    const profile = await this.prisma.discoveredProfile.findFirst({
      where: { id, identity: { userId } },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Finding not found.');
    await this.prisma.discoveredProfile.update({
      where: { id },
      data: { removedAt: new Date() },
    });
    return { removed: true };
  }
}
