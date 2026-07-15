import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokens } from '@ppm/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { IdentityService } from '../../identity/identity.service';
import { AuthService } from '../auth.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import {
  OAUTH_PROVIDERS,
  OAuthProfile,
  OAuthProviderName,
} from './oauth.providers';

interface StatePayload {
  n: string; // nonce
  linkUserId?: string; // set when an authenticated user is connecting an account
  linkIdentityId?: string; // set when connecting to prove ownership of an identity
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly crypto: CryptoService,
    private readonly identities: IdentityService,
  ) {}

  isConfigured(provider: OAuthProviderName): boolean {
    return !!this.creds(provider).clientId && !!this.creds(provider).clientSecret;
  }

  /** Builds the provider authorize URL with a signed CSRF state. */
  buildAuthUrl(
    provider: OAuthProviderName,
    linkUserId?: string,
    linkIdentityId?: string,
  ): string {
    if (!this.isConfigured(provider)) {
      throw new BadRequestException(
        `${provider} OAuth is not configured. Set ${provider.toUpperCase()}_CLIENT_ID/SECRET.`,
      );
    }
    const def = OAUTH_PROVIDERS[provider];
    const state = this.jwt.sign(
      { n: this.crypto.randomToken(8), linkUserId, linkIdentityId } satisfies StatePayload,
      { secret: this.config.get('oauth.stateSecret'), expiresIn: 600 },
    );
    const params = new URLSearchParams({
      client_id: this.creds(provider).clientId,
      redirect_uri: this.redirectUri(provider),
      response_type: 'code',
      scope: def.scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${def.authUrl}?${params.toString()}`;
  }

  /**
   * Completes the code exchange, resolves/creates the user, links the account,
   * and returns our own JWT tokens plus where to send the browser.
   */
  async handleCallback(
    provider: OAuthProviderName,
    code: string,
    state: string,
  ): Promise<{ tokens: AuthTokens; redirectTo: string; identityVerified?: boolean }> {
    const decoded = this.verifyState(state);
    const accessToken = await this.exchangeCode(provider, code);
    const profile = await this.fetchProfile(provider, accessToken);
    const user = await this.resolveUser(provider, profile, decoded.linkUserId);

    await this.upsertOAuthAccount(user.id, provider, profile.providerUserId, accessToken);

    // OAuth-as-ownership-proof: if this connect was initiated to verify an
    // identity, mark it verified when the provider profile matches.
    let identityVerified: boolean | undefined;
    if (decoded.linkIdentityId && decoded.linkUserId === user.id) {
      const result = await this.identities.verifyViaOAuthMatch(user.id, decoded.linkIdentityId, {
        email: profile.email,
        name: profile.name,
      });
      identityVerified = result.verified;
      this.logger.log(
        `OAuth identity proof for ${decoded.linkIdentityId}: ${result.verified} (${result.reason}).`,
      );
    }

    const tokens = await this.auth.issueTokensForUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      tokens,
      redirectTo: this.config.get<string>('oauth.successRedirect')!,
      identityVerified,
    };
  }

  // ── internals ───────────────────────────────────────────────

  private verifyState(state: string): StatePayload {
    try {
      return this.jwt.verify<StatePayload>(state, {
        secret: this.config.get('oauth.stateSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired OAuth state.');
    }
  }

  private async exchangeCode(provider: OAuthProviderName, code: string): Promise<string> {
    const def = OAUTH_PROVIDERS[provider];
    const body = new URLSearchParams({
      code,
      client_id: this.creds(provider).clientId,
      client_secret: this.creds(provider).clientSecret,
      redirect_uri: this.redirectUri(provider),
      grant_type: 'authorization_code',
    });
    const res = await fetch(def.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      this.logger.error(`Token exchange failed (${provider}): ${res.status}`);
      throw new UnauthorizedException('OAuth token exchange failed.');
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) throw new UnauthorizedException('No access token returned.');
    return json.access_token;
  }

  private async fetchProfile(
    provider: OAuthProviderName,
    accessToken: string,
  ): Promise<OAuthProfile> {
    const def = OAUTH_PROVIDERS[provider];
    const res = await fetch(def.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new UnauthorizedException('Failed to fetch OAuth profile.');
    const profile = def.mapProfile(await res.json());
    if (!profile.providerUserId) throw new UnauthorizedException('OAuth profile missing id.');
    return profile;
  }

  private async resolveUser(
    provider: OAuthProviderName,
    profile: OAuthProfile,
    linkUserId?: string,
  ) {
    // 1. Existing link for this provider identity.
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider, providerUserId: profile.providerUserId },
      },
      include: { user: true },
    });
    if (linked) return linked.user;

    // 2. Authenticated user is connecting a new provider.
    if (linkUserId) {
      const user = await this.users.findById(linkUserId);
      if (!user) throw new UnauthorizedException('Link target user not found.');
      return user;
    }

    // 3. Match an existing account by verified email.
    if (profile.email) {
      const existing = await this.users.findByEmail(profile.email);
      if (existing) return existing;
    }

    // 4. First-time federated sign-up (no password set).
    if (!profile.email) {
      throw new BadRequestException('Provider did not share an email; cannot create an account.');
    }
    return this.users.create({ email: profile.email, name: profile.name ?? undefined });
  }

  private async upsertOAuthAccount(
    userId: string,
    provider: OAuthProviderName,
    providerUserId: string,
    accessToken: string,
  ) {
    const encrypted = this.crypto.encrypt(accessToken);
    await this.prisma.oAuthAccount.upsert({
      where: { provider_providerUserId: { provider, providerUserId } },
      create: { userId, provider, providerUserId, accessToken: encrypted },
      update: { accessToken: encrypted },
    });
  }

  private creds(provider: OAuthProviderName) {
    return this.config.get<{ clientId: string; clientSecret: string }>(`oauth.${provider}`)!;
  }

  private redirectUri(provider: OAuthProviderName): string {
    return `${this.config.get<string>('oauth.callbackBase')}/auth/oauth/${provider}/callback`;
  }
}
