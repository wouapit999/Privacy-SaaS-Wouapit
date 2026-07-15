import { ClassificationService } from './classification.service';

// AI provider stub that never returns JSON, so the heuristic result stands.
const aiStub = { chat: jest.fn().mockResolvedValue('(stub non-json answer)') } as any;

function svc() {
  return new ClassificationService(aiStub);
}

describe('ClassificationService.classify (heuristics)', () => {
  it('infers IMAGE from an image URL', async () => {
    const c = await svc().classify({ url: 'https://cdn.example.com/me.jpg', title: null, source: 'web-search' });
    expect(c.kind).toBe('IMAGE');
  });

  it('infers COMMENT / POST from URL shape', async () => {
    const comment = await svc().classify({ url: 'https://reddit.com/r/x/comments/abc', title: null, source: 'reddit' });
    const post = await svc().classify({ url: 'https://x.com/jo/status/1', title: null, source: 'x' });
    expect(comment.kind).toBe('COMMENT');
    expect(post.kind).toBe('POST');
  });

  it('flags PII found in the title/excerpt', async () => {
    const c = await svc().classify({
      url: 'https://example.com/p',
      title: 'Contact me: jo@example.com or +1 415 555 0100',
      source: 'web-search',
      excerpt: '123 Market Street',
    });
    expect(c.hasEmail).toBe(true);
    expect(c.hasPhone).toBe(true);
    expect(c.hasAddress).toBe(true);
    expect(c.tags).toEqual(expect.arrayContaining(['has-email', 'has-phone', 'has-address']));
    expect(c.riskScore).toBeGreaterThan(0.6);
  });
});

describe('ClassificationService.correlationConfidence', () => {
  it('scores an exact handle path match highest', () => {
    expect(
      svc().correlationConfidence('jordan', { url: 'https://github.com/jordan', title: null, source: 'github' }),
    ).toBeGreaterThan(0.9);
  });

  it('scores a loose textual match in the middle', () => {
    const score = svc().correlationConfidence('jordan', {
      url: 'https://example.com/team',
      title: 'Jordan on the team',
      source: 'web-search',
    });
    expect(score).toBeGreaterThan(0.3);
    expect(score).toBeLessThan(0.9);
  });
});
