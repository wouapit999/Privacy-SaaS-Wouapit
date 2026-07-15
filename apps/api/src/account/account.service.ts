import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from '../identity/identity.service';
import { AuditService } from '../common/audit/audit.service';

/**
 * Data subject rights (GDPR Art. 15/17, CCPA): a user can export everything we
 * hold about them and permanently delete their account. Both act ONLY on the
 * authenticated caller's own data.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
    private readonly audit: AuditService,
  ) {}

  /** Right of access / portability: a full JSON bundle of the user's data. */
  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const [identities, profiles, scanJobs, privacyRequests, monitorRules, notifications, oauth] =
      await Promise.all([
        this.prisma.verifiedIdentity.findMany({ where: { userId } }),
        this.prisma.discoveredProfile.findMany({
          where: { identity: { userId } },
          include: { posts: true },
        }),
        this.prisma.scanJob.findMany({ where: { userId }, include: { results: true } }),
        this.prisma.privacyRequest.findMany({ where: { userId } }),
        this.prisma.monitorRule.findMany({ where: { userId } }),
        this.prisma.notification.findMany({ where: { userId } }),
        this.prisma.oAuthAccount.findMany({ where: { userId } }),
      ]);

    await this.audit.record({ userId, action: 'account.export' });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        consentGivenAt: user.consentGivenAt,
        marketingOptIn: user.marketingOptIn,
        createdAt: user.createdAt,
      },
      // Identity values are decrypted here because they are the user's own data.
      identities: identities.map((i) => ({
        id: i.id,
        type: i.type,
        value: this.identity.plaintext(i),
        method: i.method,
        verifiedAt: i.verifiedAt,
        createdAt: i.createdAt,
      })),
      discoveredProfiles: profiles,
      scanJobs,
      privacyRequests,
      monitorRules,
      notifications,
      // Provider links are listed, but access tokens are deliberately omitted.
      connectedAccounts: oauth.map((o) => ({
        provider: o.provider,
        providerUserId: o.providerUserId,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Right to erasure. Requires re-authentication: password for local accounts,
   * or the literal confirmation "DELETE" for OAuth-only accounts. Cascades to
   * all related rows via the schema's onDelete rules.
   */
  async deleteAccount(userId: string, password?: string, confirm?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    if (user.passwordHash) {
      if (!password || !(await argon2.verify(user.passwordHash, password))) {
        throw new UnauthorizedException('Password confirmation failed.');
      }
    } else if (confirm !== 'DELETE') {
      throw new BadRequestException(
        'This account has no password; send { "confirm": "DELETE" } to erase it.',
      );
    }

    // Audit BEFORE deletion (the row's userId is set null on user delete).
    await this.audit.record({
      userId,
      action: 'account.delete',
      meta: { email: user.email },
    });

    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.log(`Account ${userId} erased at the user's request.`);
    return { deleted: true };
  }
}
