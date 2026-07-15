import { Injectable } from '@nestjs/common';
import { DashboardDTO } from '@ppm/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly risk: RiskService,
  ) {}

  async build(userId: string): Promise<DashboardDTO> {
    const where = { identity: { userId }, removedAt: null };
    const [scores, profiles, posts, pii, top] = await Promise.all([
      this.risk.scoreFor(userId),
      this.prisma.discoveredProfile.count({ where }),
      this.prisma.discoveredPost.count({ where: { profile: { identity: { userId } } } }),
      this.prisma.discoveredProfile.groupBy({
        by: ['hasEmail', 'hasPhone', 'hasAddress'],
        where,
        _count: true,
      }),
      this.prisma.discoveredProfile.findMany({
        where,
        orderBy: { riskScore: 'desc' },
        take: 5,
      }),
    ]);

    const sum = (pred: (r: (typeof pii)[number]) => boolean) =>
      pii.filter(pred).reduce((a, r) => a + r._count, 0);

    return {
      exposureScore: scores.exposureScore,
      riskScore: scores.riskScore,
      counts: {
        profiles,
        posts,
        publicEmails: sum((r) => r.hasEmail),
        publicPhones: sum((r) => r.hasPhone),
        publicAddresses: sum((r) => r.hasAddress),
      },
      topRisks: top.map((p) => ({
        id: p.id,
        url: p.url,
        title: p.title,
        source: p.source,
        kind: p.kind,
        confidence: p.confidence,
        discoveredAt: p.discoveredAt.toISOString(),
      })),
    };
  }
}
