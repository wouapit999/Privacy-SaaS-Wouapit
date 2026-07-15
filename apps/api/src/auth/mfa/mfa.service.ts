import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokens } from '@ppm/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuthService } from '../auth.service';
import { MFA_CHALLENGE_PURPOSE } from './mfa.constants';
import { otpauthUrl, randomBase32Secret, verifyTotp } from './totp';

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Step 1 of enrolment: generate a secret and return provisioning data. The
   * secret is stored encrypted but MFA is NOT enabled until a token confirms it.
   */
  async enroll(userId: string, email: string) {
    const secret = randomBase32Secret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: this.crypto.encrypt(secret), mfaEnabled: false },
    });
    return { secret, otpauthUrl: otpauthUrl(email, secret) };
  }

  /** Step 2: verify a token against the pending secret and enable MFA. */
  async confirm(userId: string, token: string) {
    const secret = await this.currentSecret(userId);
    if (!verifyTotp(secret, token)) {
      throw new UnauthorizedException('Invalid authenticator code.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { enabled: true };
  }

  /** Turn MFA off (requires a valid current code as a safety check). */
  async disable(userId: string, token: string) {
    const secret = await this.currentSecret(userId);
    if (!verifyTotp(secret, token)) {
      throw new UnauthorizedException('Invalid authenticator code.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { enabled: false };
  }

  /**
   * Second-factor login: exchange the short-lived MFA challenge token (issued by
   * a successful password step) plus a TOTP code for real access/refresh tokens.
   */
  async loginSecondFactor(mfaToken: string, token: string): Promise<AuthTokens> {
    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwt.verifyAsync(mfaToken, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('MFA challenge expired. Sign in again.');
    }
    if (payload.purpose !== MFA_CHALLENGE_PURPOSE) {
      throw new UnauthorizedException('Invalid MFA challenge.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA is not enabled for this account.');
    }
    if (!verifyTotp(this.crypto.decrypt(user.mfaSecret), token)) {
      throw new UnauthorizedException('Invalid authenticator code.');
    }
    return this.auth.issueTokensForUser({ id: user.id, email: user.email, role: user.role });
  }

  private async currentSecret(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) {
      throw new BadRequestException('Start MFA enrolment first.');
    }
    return this.crypto.decrypt(user.mfaSecret);
  }
}
