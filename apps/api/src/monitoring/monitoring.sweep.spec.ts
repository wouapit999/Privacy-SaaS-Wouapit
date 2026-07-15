import { MonitoringSweep } from './monitoring.sweep';

describe('MonitoringSweep', () => {
  function setup() {
    const created: any[] = [];
    const updated: any[] = [];
    const notes: any[] = [];

    const prisma = {
      discoveredProfile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'p1', url: 'https://b.com', source: 'web-search' }, // still present
          { id: 'p2', url: 'https://gone.com', source: 'web-search' }, // disappeared
        ]),
        create: jest.fn((args) => created.push(args.data)),
        update: jest.fn((args) => updated.push(args)),
      },
    } as any;

    const identity = {
      ownedOrThrow: jest.fn().mockResolvedValue({
        id: 'i1',
        type: 'DOMAIN',
        displayValue: 'example.com',
        verifiedAt: new Date(),
      }),
      plaintext: jest.fn().mockReturnValue('example.com'),
    } as any;

    const discovery = {
      discover: jest.fn().mockResolvedValue([
        { url: 'https://a.com', title: 'A', source: 'web-search', kind: 'PROFILE', confidence: 0.7 }, // new
        { url: 'https://b.com', title: 'B', source: 'web-search', kind: 'PROFILE', confidence: 0.7 }, // existing
      ]),
    } as any;

    const notifications = { create: jest.fn((n) => notes.push(n)) } as any;

    const classification = {
      classify: jest.fn().mockResolvedValue({
        kind: 'PROFILE',
        tags: ['web-search', 'profile'],
        hasEmail: false,
        hasPhone: false,
        hasAddress: false,
        riskScore: 0.6,
      }),
    } as any;

    const sweep = new MonitoringSweep(prisma, identity, discovery, notifications, classification);
    return { sweep, created, updated, notes };
  }

  it('records new mentions and removed pages, leaving unchanged ones alone', async () => {
    const { sweep, created, updated, notes } = setup();

    const outcome = await sweep.sweepIdentity('u1', 'i1');

    expect(outcome).toEqual({ identityId: 'i1', newCount: 1, removedCount: 1 });
    expect(created).toHaveLength(1);
    expect(created[0].url).toBe('https://a.com');
    expect(updated).toHaveLength(1);
    expect(updated[0].where.id).toBe('p2');
    expect(updated[0].data.removedAt).toBeInstanceOf(Date);

    const types = notes.map((n) => n.type).sort();
    expect(types).toEqual(['new_mention', 'removed_page']);
  });

  it('does nothing for an unverified identity', async () => {
    const { sweep } = setup();
    (sweep as any).identity.ownedOrThrow.mockResolvedValueOnce({
      id: 'i1',
      type: 'DOMAIN',
      displayValue: 'example.com',
      verifiedAt: null,
    });

    await expect(sweep.sweepIdentity('u1', 'i1')).resolves.toEqual({
      identityId: 'i1',
      newCount: 0,
      removedCount: 0,
    });
  });
});
