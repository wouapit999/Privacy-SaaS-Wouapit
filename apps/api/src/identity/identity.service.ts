import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentityType, VerifiedIdentity } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { VerificationService } from './verification.service';
import { CreateIdentityDto } from './dto/identity.dto';

// Which verification method applies to each identity type.
const METHOD_FOR: Record<IdentityType, 'EMAIL' | 'DNS' | 'OAUTH'> = {
  EMAIL: 'EMAIL',
  DOMAIN: 'DNS',
  USERNAME: 'OAUTH',
  SOCIAL_HANDLE: 'OAUTH',
  NAME: 'EMAIL', // names are corroborated via a verified email on the account
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly verification: VerificationService,
  ) {}

  // Marks a stored value as ciphertext so plaintext() never mis-decrypts a
  // plaintext value that happens to contain '.' (e.g. a domain).
  private static readonly ENC_PREFIX = 'enc:';

  async create(userId: string, dto: CreateIdentityDto) {
    const sensitive = dto.type === 'EMAIL' || dto.type === 'SOCIAL_HANDLE';
    return this.prisma.verifiedIdentity.create({
      data: {
        userId,
        type: dto.type,
        displayValue: this.redact(dto.type, dto.value),
        valueEncrypted: sensitive
          ? IdentityService.ENC_PREFIX + this.crypto.encrypt(dto.value)
          : dto.value,
        method: METHOD_FOR[dto.type],
      },
      select: this.publicSelect(),
    });
  }

  async list(userId: string) {
    return this.prisma.verifiedIdentity.findMany({
      where: { userId },
      select: this.publicSelect(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async startVerification(userId: string, id: string) {
    const identity = await this.ownedOrThrow(userId, id);
    const token = this.verification.makeToken();
    await this.prisma.verifiedIdentity.update({
      where: { id },
      data: {
        proofToken: token,
        proofExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    if (identity.method === 'EMAIL') {
      const email = this.plaintext(identity);
      await this.verification.sendEmailProof(email, token);
      return { method: 'EMAIL', message: 'Verification link sent. Check your inbox.' };
    }
    if (identity.method === 'DNS') {
      return {
        method: 'DNS',
        instructions: this.verification.dnsInstructions(identity.displayValue, token),
      };
    }
    return {
      method: 'OAUTH',
      message: 'Connect the account via OAuth to prove ownership (stubbed).',
    };
  }

  async confirmVerification(userId: string, id: string, token?: string) {
    const identity = await this.ownedOrThrow(userId, id);
    if (!identity.proofToken || (identity.proofExpires ?? new Date(0)) < new Date()) {
      throw new BadRequestException('No active verification. Start verification first.');
    }

    let ok = false;
    if (identity.method === 'EMAIL') {
      ok = !!token && token === identity.proofToken;
    } else if (identity.method === 'DNS') {
      ok = await this.verification.checkDnsProof(
        identity.displayValue,
        identity.proofToken,
      );
    }

    if (!ok) {
      throw new BadRequestException(
        identity.method === 'DNS'
          ? 'TXT record not found yet. Confirm it is published and try again.'
          : 'Invalid or expired token.',
      );
    }

    return this.prisma.verifiedIdentity.update({
      where: { id },
      data: { verifiedAt: new Date(), proofToken: null, proofExpires: null },
      select: this.publicSelect(),
    });
  }

  /**
   * OAuth ownership proof: after a user connects a provider, mark a matching
   * identity verified. Google/Microsoft OIDC expose email + name, so we can
   * prove EMAIL and NAME identities. Handle/username/domain proofs come from
   * their own connectors (GitHub OAuth, DNS), not from these providers.
   */
  async verifyViaOAuthMatch(
    userId: string,
    identityId: string,
    profile: { email: string | null; name: string | null },
  ): Promise<{ verified: boolean; reason: string }> {
    const identity = await this.ownedOrThrow(userId, identityId);
    if (identity.verifiedAt) return { verified: true, reason: 'already-verified' };

    const match = this.oauthMatches(identity, profile);
    if (!match.ok) return { verified: false, reason: match.reason };

    await this.prisma.verifiedIdentity.update({
      where: { id: identityId },
      data: {
        verifiedAt: new Date(),
        method: 'OAUTH',
        proofToken: null,
        proofExpires: null,
      },
    });
    return { verified: true, reason: 'matched' };
  }

  private oauthMatches(
    identity: VerifiedIdentity,
    profile: { email: string | null; name: string | null },
  ): { ok: boolean; reason: string } {
    if (identity.type === 'EMAIL') {
      const claimed = this.plaintext(identity).toLowerCase();
      const provided = (profile.email ?? '').toLowerCase();
      return provided && provided === claimed
        ? { ok: true, reason: 'email-match' }
        : { ok: false, reason: 'provider email does not match this identity' };
    }
    if (identity.type === 'NAME') {
      const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
      return profile.name && norm(profile.name) === norm(identity.displayValue)
        ? { ok: true, reason: 'name-match' }
        : { ok: false, reason: 'provider name does not match this identity' };
    }
    return {
      ok: false,
      reason: `${identity.type} cannot be proven via this provider; use DNS or the matching connector`,
    };
  }

  /** Guarantees the identity exists, belongs to the caller — the ownership gate. */
  async ownedOrThrow(userId: string, id: string): Promise<VerifiedIdentity> {
    const identity = await this.prisma.verifiedIdentity.findUnique({ where: { id } });
    if (!identity) throw new NotFoundException('Identity not found.');
    if (identity.userId !== userId) {
      throw new ForbiddenException('You can only manage identities you own.');
    }
    return identity;
  }

  plaintext(identity: VerifiedIdentity): string {
    if (!identity.valueEncrypted) return identity.displayValue;
    return identity.valueEncrypted.startsWith(IdentityService.ENC_PREFIX)
      ? this.crypto.decrypt(
          identity.valueEncrypted.slice(IdentityService.ENC_PREFIX.length),
        )
      : identity.valueEncrypted;
  }

  private redact(type: IdentityType, value: string): string {
    if (type === 'EMAIL') {
      const [local, domain] = value.split('@');
      if (!domain) return value;
      const shown = local.slice(0, 2);
      return `${shown}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
    }
    return value;
  }

  private publicSelect() {
    return {
      id: true,
      type: true,
      displayValue: true,
      method: true,
      verifiedAt: true,
      createdAt: true,
    } as const;
  }
}
