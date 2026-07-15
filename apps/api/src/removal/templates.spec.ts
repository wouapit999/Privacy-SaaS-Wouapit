import { renderTemplate } from './templates';

const ctx = {
  requesterName: 'Jordan Lee',
  requesterEmail: 'jordan@example.com',
  targetUrl: 'https://forum.example.com/user/jordan',
  source: 'forum.example.com',
};

describe('renderTemplate', () => {
  it('renders a GDPR erasure request with Article 17 reference', () => {
    const out = renderTemplate('GDPR', ctx);
    expect(out).toContain('Article 17');
    expect(out).toContain(ctx.targetUrl);
    expect(out).toContain(ctx.requesterName);
  });

  it('renders a CCPA deletion request with the statute citation', () => {
    const out = renderTemplate('CCPA', ctx);
    expect(out).toContain('1798.105');
    expect(out).toContain(ctx.requesterEmail);
  });

  it('renders privacy-settings guidance', () => {
    const out = renderTemplate('PRIVACY_SETTINGS', ctx);
    expect(out.toLowerCase()).toContain('visibility');
  });
});
