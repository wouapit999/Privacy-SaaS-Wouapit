import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IdentityService } from '../identity/identity.service';

export interface BreachRecord {
  name: string;
  domain: string | null;
  date: string | null;
  dataClasses: string[];
}

/**
 * Email breach exposure via Have I Been Pwned (§5.3). Requires a paid HIBP API
 * key, so it runs server-side. It only ever checks an email the user has added
 * as their OWN identity — never an arbitrary address. The keyless, privacy-safe
 * password check runs entirely in the browser (see web/src/lib/pwned.ts).
 */
@Injectable()
export class BreachService {
  private readonly logger = new Logger(BreachService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly identity: IdentityService,
  ) {}

  private get apiKey(): string {
    return this.config.get<string>('hibp.apiKey') ?? '';
  }

  status() {
    return { emailCheckConfigured: !!this.apiKey };
  }

  async emailBreaches(userId: string, identityId: string) {
    if (!this.apiKey) {
      throw new BadRequestException(
        'Email breach check is not configured. Set HIBP_API_KEY on the API.',
      );
    }
    const identity = await this.identity.ownedOrThrow(userId, identityId);
    if (identity.type !== 'EMAIL') {
      throw new BadRequestException('Breach check applies to EMAIL identities only.');
    }
    const email = this.identity.plaintext(identity);

    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: { 'hibp-api-key': this.apiKey, 'user-agent': 'PrivacyPresenceManager' },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (res.status === 404) {
      return { identity: identity.displayValue, breaches: [] as BreachRecord[] };
    }
    if (res.status === 401) throw new BadRequestException('Invalid HIBP API key.');
    if (res.status === 429) throw new BadRequestException('Rate limited by HIBP; try again shortly.');
    if (!res.ok) {
      this.logger.error(`HIBP request failed: ${res.status}`);
      throw new BadRequestException('Breach lookup failed.');
    }

    const data = (await res.json()) as Array<{
      Name: string;
      Domain?: string;
      BreachDate?: string;
      DataClasses?: string[];
    }>;

    const breaches: BreachRecord[] = data.map((b) => ({
      name: b.Name,
      domain: b.Domain ?? null,
      date: b.BreachDate ?? null,
      dataClasses: b.DataClasses ?? [],
    }));
    return { identity: identity.displayValue, breaches };
  }
}
