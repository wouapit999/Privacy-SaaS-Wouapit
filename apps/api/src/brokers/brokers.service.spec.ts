import { BadRequestException } from '@nestjs/common';
import { BrokersService } from './brokers.service';
import { BROKERS } from './brokers.data';

function make() {
  const created: any[] = [];
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ name: 'Jo Doe', email: 'jo@example.com' }) },
    privacyRequest: { create: jest.fn((a) => { created.push(a.data); return { id: 'r1', ...a.data }; }) },
  } as any;
  return { svc: new BrokersService(prisma), created };
}

describe('BrokersService', () => {
  it('exposes a non-empty broker catalog', () => {
    expect(make().svc.list().length).toBeGreaterThan(5);
    expect(BROKERS.every((b) => b.id && b.optOutUrl && b.jurisdiction)).toBe(true);
  });

  it('generates an opt-out request using the broker jurisdiction and user details', async () => {
    const { svc, created } = make();
    const out = await svc.generateOptOut('u1', 'spokeo');

    expect(out.broker.name).toBe('Spokeo');
    expect(out.kind).toBe('CCPA'); // Spokeo's jurisdiction
    expect(out.body).toContain('Spokeo');
    expect(out.body).toContain('Jo Doe');
    expect(created[0]).toMatchObject({ userId: 'u1', kind: 'CCPA', status: 'DRAFT' });
  });

  it('rejects an unknown broker', async () => {
    await expect(make().svc.generateOptOut('u1', 'nope')).rejects.toBeInstanceOf(BadRequestException);
  });
});
