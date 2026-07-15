import { BadRequestException } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { OAUTH_PROVIDERS } from './oauth.providers';

function makeService(configured = true) {
  const creds = configured
    ? { clientId: 'gid', clientSecret: 'gsec' }
    : { clientId: '', clientSecret: '' };

  const config = {
    get: (k: string) => {
      if (k === 'oauth.google') return creds;
      if (k === 'oauth.stateSecret') return 'state-secret';
      if (k === 'oauth.callbackBase') return 'http://localhost:4000';
      return undefined;
    },
  } as any;
  const jwt = { sign: jest.fn().mockReturnValue('SIGNED_STATE') } as any;
  const crypto = { randomToken: jest.fn().mockReturnValue('nonce') } as any;

  return new OAuthService(config, jwt, {} as any, {} as any, {} as any, crypto, {} as any);
}

describe('OAuthService.buildAuthUrl', () => {
  it('throws when the provider is not configured', () => {
    const svc = makeService(false);
    expect(() => svc.buildAuthUrl('google')).toThrow(BadRequestException);
  });

  it('builds a valid authorize URL with the signed state and correct redirect', () => {
    const svc = makeService(true);
    const url = new URL(svc.buildAuthUrl('google'));

    expect(`${url.origin}${url.pathname}`).toBe(OAUTH_PROVIDERS.google.authUrl);
    expect(url.searchParams.get('client_id')).toBe('gid');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('SIGNED_STATE');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:4000/auth/oauth/google/callback',
    );
  });

  it('reports configuration status', () => {
    expect(makeService(true).isConfigured('google')).toBe(true);
    expect(makeService(false).isConfigured('google')).toBe(false);
  });
});

describe('provider profile mapping', () => {
  it('maps a Google userinfo payload', () => {
    expect(
      OAUTH_PROVIDERS.google.mapProfile({ sub: '123', email: 'a@b.com', name: 'A B' }),
    ).toEqual({ providerUserId: '123', email: 'a@b.com', name: 'A B' });
  });

  it('maps a Microsoft payload, falling back to oid and preferred_username', () => {
    expect(
      OAUTH_PROVIDERS.microsoft.mapProfile({ oid: 'x1', preferred_username: 'u@m.com' }),
    ).toEqual({ providerUserId: 'x1', email: 'u@m.com', name: null });
  });
});
