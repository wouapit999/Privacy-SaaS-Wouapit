import { RiskService } from './risk.service';

function serviceWith(profiles: any[], unconfirmed = 0) {
  const prisma = {
    discoveredProfile: {
      // Only verified profiles are returned by the scored query.
      findMany: jest.fn().mockResolvedValue(profiles),
      count: jest.fn().mockResolvedValue(unconfirmed),
    },
  } as any;
  return new RiskService(prisma);
}

describe('RiskService', () => {
  it('returns zeros (plus the unconfirmed count) when nothing is confirmed', async () => {
    const svc = serviceWith([], 3);
    await expect(svc.scoreFor('u1')).resolves.toEqual({
      exposureScore: 0,
      riskScore: 0,
      sampleSize: 0,
      unconfirmed: 3,
    });
  });

  it('keeps scores within 0..100 and raises risk with PII', async () => {
    const base = { confidence: 0.9, riskScore: 0.9, hasEmail: false, hasPhone: false, hasAddress: false };
    const withPii = { confidence: 0.9, riskScore: 0.9, hasEmail: true, hasPhone: true, hasAddress: true };

    const low = await serviceWith([base, base]).scoreFor('u1');
    const high = await serviceWith([withPii, withPii]).scoreFor('u1');

    expect(low.exposureScore).toBeGreaterThanOrEqual(0);
    expect(high.riskScore).toBeGreaterThan(low.riskScore);
    expect(high.riskScore).toBeLessThanOrEqual(100);
  });
});
