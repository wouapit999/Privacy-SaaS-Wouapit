import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { renderTemplate } from '../removal/templates';
import { BROKERS, findBroker } from './brokers.data';

@Injectable()
export class BrokersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public catalog of data brokers and how to opt out of each. */
  list() {
    return BROKERS;
  }

  /**
   * Generates a ready-to-send opt-out / deletion request for one broker, using
   * the legal instrument that broker honors (CCPA or GDPR) and the caller's own
   * details. Saved as a PrivacyRequest so it shows in their removal history.
   * We generate — the user reviews and sends it themselves.
   */
  async generateOptOut(userId: string, brokerId: string) {
    const broker = findBroker(brokerId);
    if (!broker) throw new BadRequestException('Unknown broker.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const body = renderTemplate(broker.jurisdiction, {
      requesterName: user?.name ?? 'The data subject',
      requesterEmail: user?.email ?? '',
      targetUrl: broker.optOutUrl,
      source: broker.name,
    });

    const request = await this.prisma.privacyRequest.create({
      data: { userId, kind: broker.jurisdiction, body, status: 'DRAFT' },
    });

    return {
      id: request.id,
      broker: { id: broker.id, name: broker.name, domain: broker.domain },
      kind: broker.jurisdiction,
      method: broker.method,
      sendTo: broker.method === 'EMAIL' ? broker.optOutEmail ?? null : broker.optOutUrl,
      body,
      guidance:
        broker.method === 'EMAIL'
          ? `Send this from your own email to ${broker.optOutEmail}. ${broker.notes ?? ''}`.trim()
          : `Open ${broker.optOutUrl}, complete the opt-out form, and paste this request where a message is asked for. ${broker.notes ?? ''}`.trim(),
    };
  }
}
