import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exposure = how much of the user is publicly findable (breadth).
   * Risk = how sensitive that exposure is (PII presence, profile prominence).
   * Both normalized to 0..100.
   */
  async scoreFor(userId: string) {
    const base = { identity: { userId }, removedAt: null };
    // Only VERIFIED (evidence-confirmed) findings count toward the score.
    // Unconfirmed hits are reported separately for the user to review.
    const [profiles, unconfirmed] = await Promise.all([
      this.prisma.discoveredProfile.findMany({
        where: { ...base, verified: true },
        select: { confidence: true, riskScore: true, hasEmail: true, hasPhone: true, hasAddress: true },
      }),
      this.prisma.discoveredProfile.count({ where: { ...base, verified: false } }),
    ]);

    if (profiles.length === 0) {
      return { exposureScore: 0, riskScore: 0, sampleSize: 0, unconfirmed };
    }

    // Exposure grows with count but saturates (log curve) so it stays 0..100.
    const exposureScore = Math.min(100, Math.round(Math.log2(profiles.length + 1) * 20));

    const piiWeight = profiles.reduce((acc, p) => {
      let w = p.riskScore;
      if (p.hasEmail) w += 0.2;
      if (p.hasPhone) w += 0.4;
      if (p.hasAddress) w += 0.6;
      return acc + Math.min(1.5, w);
    }, 0);
    const riskScore = Math.min(100, Math.round((piiWeight / profiles.length) * 66));

    return { exposureScore, riskScore, sampleSize: profiles.length, unconfirmed };
  }
}
