import { Injectable } from '@nestjs/common';
import { MonitorFrequency } from '@ppm/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';

@Injectable()
export class MonitorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Creates a monitoring rule. If the query looks like an email, we store its
   * hash (never the raw address) so scheduled checks can match without holding
   * plaintext PII.
   */
  async create(userId: string, query: string, frequency: MonitorFrequency) {
    const isEmail = /\S+@\S+\.\S+/.test(query);
    const stored = isEmail ? `emailhash:${this.crypto.hash(query)}` : query;

    const rule = await this.prisma.monitorRule.create({
      data: { userId, query: stored, frequency, active: true },
    });
    return { id: rule.id, frequency: rule.frequency, active: rule.active };
  }

  list(userId: string) {
    return this.prisma.monitorRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
