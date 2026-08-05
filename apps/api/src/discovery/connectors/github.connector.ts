import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryHit, DiscoveryQuery, PresenceConnector } from './connector.interface';

/**
 * GitHub public-profile connector. Uses the official public REST API (no auth
 * required for public user lookup). If GITHUB_CLIENT_ID/SECRET are set the app
 * would use them for a higher rate limit; unauthenticated still works read-only.
 */
@Injectable()
export class GithubConnector implements PresenceConnector {
  readonly source = 'github';
  private readonly logger = new Logger(GithubConnector.name);

  supports(query: DiscoveryQuery): boolean {
    return query.type === 'USERNAME' || query.type === 'SOCIAL_HANDLE';
  }

  async search(query: DiscoveryQuery): Promise<DiscoveryHit[]> {
    const handle = query.value.replace(/^@/, '');
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
        headers: { 'User-Agent': 'PrivacyPresenceManagerBot', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return [];
      const user = (await res.json()) as { html_url: string; name?: string; login: string };
      return [
        {
          url: user.html_url,
          title: user.name ? `${user.name} (@${user.login})` : `@${user.login}`,
          source: this.source,
          kind: 'PROFILE',
          confidence: 0.9,
          // Authoritative API confirmed this exact handle exists.
          verified: true,
          evidence: `GitHub public API confirmed the account @${user.login}.`,
        },
      ];
    } catch (err) {
      this.logger.warn(`GitHub lookup failed: ${(err as Error).message}`);
      return [];
    }
  }
}
