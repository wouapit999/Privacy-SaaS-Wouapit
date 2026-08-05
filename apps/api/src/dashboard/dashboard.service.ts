import { Injectable } from '@nestjs/common';
import { DashboardDTO } from '@ppm/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { findingSeverity, emptySeverityCounts } from '../risk/severity';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly risk: RiskService,
  ) {}

  async build(userId: string): Promise<DashboardDTO> {
    const where = { identity: { userId }, removedAt: null };
    // Confirmed = evidence-verified. Counts/PII/top-risks use only confirmed
    // findings; unconfirmed hits are surfaced as a separate "needs review" count.
    const confirmed = { ...where, verified: true };
    const [scores, unconfirmed, posts, pii, confirmedProfiles] = await Promise.all([
      this.risk.scoreFor(userId),
      this.prisma.discoveredProfile.count({ where: { ...where, verified: false } }),
      this.prisma.discoveredPost.count({ where: { profile: { identity: { userId } } } }),
      this.prisma.discoveredProfile.groupBy({
        by: ['hasEmail', 'hasPhone', 'hasAddress'],
        where: confirmed,
        _count: true,
      }),
      this.prisma.discoveredProfile.findMany({
        where: confirmed,
        select: {
          id: true, url: true, title: true, source: true, kind: true,
          confidence: true, discoveredAt: true, verified: true,
          riskScore: true, hasEmail: true, hasPhone: true, hasAddress: true,
        },
      }),
    ]);

    // Deterministic per-finding severity (§5.1); tally the distribution.
    const severityCounts = emptySeverityCounts();
    const scored = confirmedProfiles.map((p) => {
      const { risk, severity } = findingSeverity(p);
      severityCounts[severity] += 1;
      return { ...p, risk, severity };
    });

    const sum = (pred: (r: (typeof pii)[number]) => boolean) =>
      pii.filter(pred).reduce((a, r) => a + r._count, 0);

    return {
      exposureScore: scores.exposureScore,
      riskScore: scores.riskScore,
      counts: {
        profiles: confirmedProfiles.length,
        unconfirmed,
        posts,
        publicEmails: sum((r) => r.hasEmail),
        publicPhones: sum((r) => r.hasPhone),
        publicAddresses: sum((r) => r.hasAddress),
      },
      severityCounts,
      topRisks: scored
        .sort((a, b) => b.risk - a.risk)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          url: p.url,
          title: p.title,
          source: p.source,
          kind: p.kind,
          confidence: p.confidence,
          verified: p.verified,
          severity: p.severity,
          discoveredAt: p.discoveredAt.toISOString(),
        })),
    };
  }
}
