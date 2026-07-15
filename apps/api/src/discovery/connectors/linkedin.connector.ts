import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryHit, DiscoveryQuery, PresenceConnector } from './connector.interface';

/**
 * LinkedIn connector.
 *
 * LinkedIn has no public "look up any profile" API — profile data is only
 * accessible for the authenticated member via OpenID Connect (`/v2/userinfo`).
 * That means we can surface the user's OWN LinkedIn profile only after they
 * connect LinkedIn via OAuth (token stored in `oauth_accounts`). We deliberately
 * do NOT scrape LinkedIn, which its terms prohibit.
 *
 * Until a per-user LinkedIn token is threaded through, this connector stays
 * disabled (returns nothing) unless LINKEDIN_CLIENT_ID is configured, in which
 * case it emits a single guidance hint for the user's own profile.
 */
@Injectable()
export class LinkedInConnector implements PresenceConnector {
  readonly source = 'linkedin';
  private readonly logger = new Logger(LinkedInConnector.name);
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    this.configured = !!config.get<string>('social.linkedinClientId');
  }

  supports(query: DiscoveryQuery): boolean {
    return (
      this.configured &&
      (query.type === 'USERNAME' || query.type === 'SOCIAL_HANDLE')
    );
  }

  async search(query: DiscoveryQuery): Promise<DiscoveryHit[]> {
    // TODO: exchange the user's connected LinkedIn OAuth token for /v2/userinfo
    // and return their own verified profile. No scraping.
    this.logger.log(
      `LinkedIn connector configured but needs member OAuth to resolve "${query.value}".`,
    );
    return [];
  }
}
