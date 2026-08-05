import { ConfigService } from '@nestjs/config';
import { EvidenceService } from './evidence.service';
import { DiscoveryHit, DiscoveryQuery } from './connectors/connector.interface';

const config = {
  get: (k: string) => (k === 'discovery.userAgent' ? 'PPMBot/0.1' : undefined),
} as ConfigService;

const hit = (over: Partial<DiscoveryHit> = {}): DiscoveryHit => ({
  url: 'https://example.com/p',
  title: 'x',
  source: 'web-search',
  kind: 'PROFILE',
  confidence: 0.5,
  ...over,
});

function mockFetch(body: string, contentType = 'text/html', ok = true) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    headers: { get: () => contentType },
    text: async () => body,
  } as unknown as Response);
}

describe('EvidenceService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('trusts a connector that already verified via authoritative API (no fetch)', async () => {
    const spy = jest.spyOn(global, 'fetch');
    const svc = new EvidenceService(config);
    const res = await svc.verify({ type: 'USERNAME', value: 'alice' }, hit({ verified: true, evidence: 'API confirmed' }));
    expect(res).toEqual({ verified: true, evidence: 'API confirmed' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('confirms when the page content contains the identifier, with a snippet', async () => {
    mockFetch('<html><body>Contact alice@example.com for details</body></html>');
    const svc = new EvidenceService(config);
    const q: DiscoveryQuery = { type: 'EMAIL', value: 'alice@example.com' };
    const res = await svc.verify(q, hit());
    expect(res.verified).toBe(true);
    expect(res.evidence).toContain('alice@example.com');
  });

  it('does NOT confirm when the identifier is absent from the content', async () => {
    mockFetch('<html><body>nobody here</body></html>');
    const svc = new EvidenceService(config);
    const res = await svc.verify({ type: 'EMAIL', value: 'alice@example.com' }, hit());
    expect(res.verified).toBe(false);
  });

  it('matches a name even when split across whitespace/markup', async () => {
    mockFetch('<h1>Jane\n   Doe</h1>');
    const svc = new EvidenceService(config);
    const res = await svc.verify({ type: 'NAME', value: 'Jane Doe' }, hit());
    expect(res.verified).toBe(true);
  });

  it('ignores non-text responses', async () => {
    mockFetch('%PDF-1.4 binary', 'application/pdf');
    const svc = new EvidenceService(config);
    const res = await svc.verify({ type: 'NAME', value: 'Jane Doe' }, hit());
    expect(res.verified).toBe(false);
  });
});
