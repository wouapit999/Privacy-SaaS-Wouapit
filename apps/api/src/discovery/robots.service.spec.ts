import { ConfigService } from '@nestjs/config';
import { RobotsService } from './robots.service';

function makeService(enabled = true) {
  const config = {
    get: (k: string) =>
      k === 'discovery.userAgent'
        ? 'PrivacyPresenceManagerBot/0.1'
        : k === 'discovery.respectRobots'
          ? enabled
          : undefined,
  } as ConfigService;
  return new RobotsService(config);
}

describe('RobotsService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('throws if robots compliance is disabled', async () => {
    const svc = makeService(false);
    await expect(svc.isAllowed('https://example.com/')).rejects.toThrow(/cannot be disabled/);
  });

  it('disallows a path blocked by robots.txt', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'User-agent: *\nDisallow: /private',
    } as Response);

    const svc = makeService();
    expect(await svc.isAllowed('https://example.com/private/page')).toBe(false);
    expect(await svc.isAllowed('https://example.com/public/page')).toBe(true);
  });

  it('allows everything when robots.txt is missing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    const svc = makeService();
    expect(await svc.isAllowed('https://nolimits.example.com/anything')).toBe(true);
  });

  it('rejects non-http(s) schemes', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    const svc = makeService();
    expect(await svc.isAllowed('ftp://example.com/x')).toBe(false);
  });
});
