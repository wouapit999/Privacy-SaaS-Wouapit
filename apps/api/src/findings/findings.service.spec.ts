import { NotFoundException } from '@nestjs/common';
import { FindingsService } from './findings.service';

const profile = {
  id: 'p1', url: 'https://x.com/u', title: 'U', source: 'web-search', kind: 'PROFILE',
  confidence: 0.9, verified: true, evidence: 'found alice', discoveredAt: new Date('2026-01-01'),
  riskScore: 0.9, hasEmail: true, hasPhone: true, hasAddress: true,
};

describe('FindingsService', () => {
  it('lists findings with a derived severity and ISO date', async () => {
    const prisma = { discoveredProfile: { findMany: jest.fn().mockResolvedValue([profile]) } } as any;
    const [f] = await new FindingsService(prisma).list('u1');
    expect(f.id).toBe('p1');
    expect(f.evidence).toBe('found alice');
    expect(['high', 'critical']).toContain(f.severity); // high-PII, high-confidence
    expect(f.discoveredAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('marks a finding removed when owned', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      discoveredProfile: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }), update },
    } as any;
    await expect(new FindingsService(prisma).markRemoved('u1', 'p1')).resolves.toEqual({ removed: true });
    expect(update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { removedAt: expect.any(Date) } });
  });

  it('refuses to remove a finding the caller does not own', async () => {
    const prisma = { discoveredProfile: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() } } as any;
    await expect(new FindingsService(prisma).markRemoved('u1', 'p1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
