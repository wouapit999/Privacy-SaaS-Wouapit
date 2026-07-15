import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';
import { CryptoService } from '../common/crypto/crypto.service';

/**
 * Ownership proofs. Two live methods:
 *  - EMAIL: we send a tokened link; user clicks; token is confirmed.
 *  - DNS:   user adds a TXT record `ppm-verify=<token>` to their domain.
 *
 * OAUTH proof (connecting an account you control) is handled by the auth flow.
 * None of these access anything the user does not already control.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly crypto: CryptoService) {}

  /** Deterministic proof token derived from a per-identity random seed. */
  makeToken(): string {
    return this.crypto.randomToken(18);
  }

  /**
   * In production this sends a real email via the notifications provider.
   * In the slice we log the link so the flow is exercisable locally.
   */
  async sendEmailProof(email: string, token: string): Promise<void> {
    const link = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/identity/confirm?token=${token}`;
    this.logger.log(`[email-proof] To ${email}: confirm ownership → ${link}`);
    // TODO: integrate transactional email provider (SES/Resend/Postmark).
  }

  /** Looks up TXT records for the domain and checks for `ppm-verify=<token>`. */
  async checkDnsProof(domain: string, token: string): Promise<boolean> {
    try {
      const records = await dns.resolveTxt(domain);
      const flat = records.map((chunks) => chunks.join(''));
      return flat.some((r) => r.includes(`ppm-verify=${token}`));
    } catch (err) {
      this.logger.warn(`DNS lookup failed for ${domain}: ${(err as Error).message}`);
      return false;
    }
  }

  dnsInstructions(domain: string, token: string) {
    return {
      recordType: 'TXT',
      host: domain,
      value: `ppm-verify=${token}`,
      note: 'Add this TXT record at your DNS provider, then confirm. It can take a few minutes to propagate.',
    };
  }
}
