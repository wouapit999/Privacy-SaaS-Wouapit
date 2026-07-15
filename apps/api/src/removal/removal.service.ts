import { BadRequestException, Injectable } from '@nestjs/common';
import { RemovalKind } from '@ppm/shared';

import { PrismaService } from '../prisma/prisma.service';
import { renderTemplate } from './templates';

@Injectable()
export class RemovalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, discoveredProfileId: string, kind: RemovalKind) {
    const profile = await this.prisma.discoveredProfile.findFirst({
      where: { id: discoveredProfileId, identity: { userId } },
    });
    if (!profile) throw new BadRequestException('Discovered profile not found.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const body = renderTemplate(kind, {
      requesterName: user?.name ?? 'The data subject',
      requesterEmail: user?.email ?? '',
      targetUrl: profile.url,
      source: profile.source,
    });

    const request = await this.prisma.privacyRequest.create({
      data: { userId, profileId: profile.id, kind, body, status: 'DRAFT' },
    });

    return {
      id: request.id,
      kind,
      status: request.status,
      body,
      guidance:
        'Review the generated request, then send it from your own email to the ' +
        'platform\'s privacy contact. We never send it on your behalf without confirmation.',
    };
  }
}
