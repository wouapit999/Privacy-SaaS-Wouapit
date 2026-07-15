import { RiskService } from './risk.service';

function serviceWith(profiles: any[]) {
  const prisma = {
    discoveredProfile: { findMany: jest.fn().mockResolvedValue(profiles) },
  } as any;
  return new RiskService(prisma);
}

describe('RiskService', () => {
  it('returns zeros when nothing is discovered', async () => {
    const svc = serviceWith([]);
    await expect(svc.scoreFor('u1')).resolves.toEqual({
      exposureScore: 0,
      riskScore: 0,
      sampleSize: 0,
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
