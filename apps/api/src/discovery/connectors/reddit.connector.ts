import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryHit, DiscoveryQuery, PresenceConnector } from './connector.interface';

/**
 * Reddit public-profile connector. Uses Reddit's public JSON endpoint
 * (`/user/<name>/about.json`), which requires only a descriptive User-Agent and
 * no authentication. Read-only, public data, per Reddit's API terms.
 */
@Injectable()
export class RedditConnector implements PresenceConnector {
  readonly source = 'reddit';
  private readonly logger = new Logger(RedditConnector.name);
  private readonly userAgent: string;

  constructor(config: ConfigService) {
    this.userAgent = config.get<string>('discovery.userAgent')!;
  }

  supports(query: DiscoveryQuery): boolean {
    return query.type === 'USERNAME' || query.type === 'SOCIAL_HANDLE';
  }

  async search(query: DiscoveryQuery): Promise<DiscoveryHit[]> {
    const handle = query.value.replace(/^(u\/|@)/, '');
    try {
      const res = await fetch(
        `https://www.reddit.com/user/${encodeURIComponent(handle)}/about.json`,
        { headers: { 'User-Agent': this.userAgent }, signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: { name?: string; subreddit?: { url?: string } } };
      const name = body.data?.name;
      if (!name) return [];
      return [
        {
          url: `https://www.reddit.com/user/${name}`,
          title: `u/${name} on Reddit`,
          source: this.source,
          kind: 'PROFILE',
          confidence: 0.85,
        },
      ];
    } catch (err) {
      this.logger.warn(`Reddit lookup failed: ${(err as Error).message}`);
      return [];
    }
  }
}
