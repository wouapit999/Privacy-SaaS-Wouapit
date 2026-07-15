import { Injectable } from '@nestjs/common';
import { DiscoveryHit, DiscoveryQuery, PresenceConnector } from './connector.interface';

/**
 * Search-engine-index connector (STUB).
 *
 * A production build would call an approved search API (e.g. Bing Web Search,
 * Google Programmable Search) with the user's own identity terms, honoring the
 * provider's ToS and rate limits. We do NOT scrape search result pages.
 *
 * With no API key configured, this returns a single deterministic placeholder
 * so the end-to-end scan path is exercisable locally.
 */
@Injectable()
export class WebSearchConnector implements PresenceConnector {
  readonly source = 'web-search';

  supports(_query: DiscoveryQuery): boolean {
    return true; // applies to every identity type
  }

  async search(query: DiscoveryQuery): Promise<DiscoveryHit[]> {
    // TODO: replace with approved search API call keyed off process.env.SEARCH_API_KEY.
    const slug = encodeURIComponent(query.value);
    return [
      {
        url: `https://example.com/search?q=${slug}`,
        title: `Indexed pages mentioning "${query.value}" (stub)`,
        source: this.source,
        kind: 'CACHED_PAGE',
        confidence: 0.4,
      },
    ];
  }
}
