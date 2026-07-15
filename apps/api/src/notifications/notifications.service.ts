import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailProvider } from './mail.provider';

interface CreateNotification {
  userId: string;
  type: string; // new_mention | removed_page | report
  title: string;
  body?: string;
  email?: boolean; // also send an email to the user's account address
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailProvider,
  ) {}

  async create(input: CreateNotification) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
      },
    });

    if (input.email) {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
      if (user?.email) {
        await this.mail.send({
          to: user.email,
          subject: input.title,
          text: input.body ?? input.title,
        });
      }
    }
    return notification;
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new ForbiddenException('Notification not found.');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
