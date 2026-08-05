import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BreachService } from './breach.service';

function make(apiKey: string, identity: any = { type: 'EMAIL', displayValue: 'a***@x.com' }) {
  const config = { get: (k: string) => (k === 'hibp.apiKey' ? apiKey : undefined) } as ConfigService;
  const id = {
    ownedOrThrow: jest.fn().mockResolvedValue(identity),
    plaintext: jest.fn().mockReturnValue('alice@example.com'),
  } as any;
  return new BreachService(config, id);
}

function mockFetch(status: number, body: unknown = []) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

describe('BreachService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports whether the email check is configured', () => {
    expect(make('').status()).toEqual({ emailCheckConfigured: false });
    expect(make('key').status()).toEqual({ emailCheckConfigured: true });
  });

  it('refuses the email check when no API key is set', async () => {
    await expect(make('').emailBreaches('u1', 'i1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-email identity', async () => {
    const svc = make('key', { type: 'DOMAIN', displayValue: 'example.com' });
    await expect(svc.emailBreaches('u1', 'i1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns an empty list when HIBP has no record (404)', async () => {
    mockFetch(404);
    const res = await make('key').emailBreaches('u1', 'i1');
    expect(res.breaches).toEqual([]);
  });

  it('maps HIBP breaches into normalized records', async () => {
    mockFetch(200, [
      { Name: 'Adobe', Domain: 'adobe.com', BreachDate: '2013-10-04', DataClasses: ['Emails', 'Passwords'] },
    ]);
    const res = await make('key').emailBreaches('u1', 'i1');
    expect(res.breaches).toEqual([
      { name: 'Adobe', domain: 'adobe.com', date: '2013-10-04', dataClasses: ['Emails', 'Passwords'] },
    ]);
  });
});
