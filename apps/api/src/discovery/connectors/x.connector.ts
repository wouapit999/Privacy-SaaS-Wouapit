import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryHit, DiscoveryQuery, PresenceConnector } from './connector.interface';

/**
 * X (Twitter) connector via the official API v2. Requires an app bearer token
 * (X_BEARER_TOKEN); when absent the connector self-disables (returns nothing)
 * rather than scraping. Looks up only public profiles by username.
 */
@Injectable()
export class XConnector implements PresenceConnector {
  readonly source = 'x';
  private readonly logger = new Logger(XConnector.name);
  private readonly bearer: string;

  constructor(config: ConfigService) {
    this.bearer = config.get<string>('social.xBearerToken')!;
  }

  supports(query: DiscoveryQuery): boolean {
    return (
      !!this.bearer && (query.type === 'USERNAME' || query.type === 'SOCIAL_HANDLE')
    );
  }

  async search(query: DiscoveryQuery): Promise<DiscoveryHit[]> {
    const handle = query.value.replace(/^@/, '');
    try {
      const res = await fetch(
        `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}`,
        {
          headers: { Authorization: `Bearer ${this.bearer}` },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: { username?: string; name?: string } };
      const u = body.data?.username;
      if (!u) return [];
      return [
        {
          url: `https://x.com/${u}`,
          title: body.data?.name ? `${body.data.name} (@${u})` : `@${u}`,
          source: this.source,
          kind: 'PROFILE',
          confidence: 0.85,
        },
      ];
    } catch (err) {
      this.logger.warn(`X lookup failed: ${(err as Error).message}`);
      return [];
    }
  }
}
