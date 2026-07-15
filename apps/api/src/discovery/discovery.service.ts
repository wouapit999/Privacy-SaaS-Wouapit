import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RobotsService } from './robots.service';
import { GithubConnector } from './connectors/github.connector';
import { RedditConnector } from './connectors/reddit.connector';
import { XConnector } from './connectors/x.connector';
import { LinkedInConnector } from './connectors/linkedin.connector';
import { WebSearchConnector } from './connectors/web-search.connector';
import { DiscoveryHit, DiscoveryQuery, PresenceConnector } from './connectors/connector.interface';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly connectors: PresenceConnector[];
  private readonly maxPages: number;

  constructor(
    private readonly robots: RobotsService,
    config: ConfigService,
    github: GithubConnector,
    reddit: RedditConnector,
    x: XConnector,
    linkedin: LinkedInConnector,
    webSearch: WebSearchConnector,
  ) {
    this.connectors = [github, reddit, x, linkedin, webSearch];
    this.maxPages = config.get<number>('discovery.maxPagesPerScan')!;
  }

  /**
   * Runs every applicable connector for a single verified identity, then filters
   * every hit through robots.txt before returning it.
   */
  async discover(query: DiscoveryQuery): Promise<DiscoveryHit[]> {
    const applicable = this.connectors.filter((c) => c.supports(query));
    const settled = await Promise.allSettled(applicable.map((c) => c.search(query)));

    const raw: DiscoveryHit[] = [];
    for (const s of settled) {
      if (s.status === 'fulfilled') raw.push(...s.value);
      else this.logger.warn(`Connector error: ${s.reason}`);
    }

    const allowed: DiscoveryHit[] = [];
    for (const hit of raw.slice(0, this.maxPages)) {
      if (await this.robots.isAllowed(hit.url)) {
        allowed.push(hit);
      } else {
        this.logger.log(`Skipped (robots.txt disallow): ${hit.url}`);
      }
    }
    return this.dedupe(allowed);
  }

  /** Simple URL-based duplicate detection; identity correlation lives in copilot/risk. */
  private dedupe(hits: DiscoveryHit[]): DiscoveryHit[] {
    const seen = new Set<string>();
    return hits.filter((h) => {
      const key = h.url.replace(/\/$/, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
