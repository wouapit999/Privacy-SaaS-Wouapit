import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';

type Period = 'weekly' | 'monthly';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Builds a human-readable report for one user and returns its text. */
  async buildForUser(userId: string, period: Period): Promise<string> {
    const since = new Date();
    since.setDate(since.getDate() - (period === 'weekly' ? 7 : 30));

    const [dash, added, removed] = await Promise.all([
      this.dashboard.build(userId),
      this.prisma.discoveredProfile.count({
        where: { identity: { userId }, discoveredAt: { gte: since } },
      }),
      this.prisma.discoveredProfile.count({
        where: { identity: { userId }, removedAt: { gte: since } },
      }),
    ]);

    const label = period === 'weekly' ? 'Weekly' : 'Monthly';
    return [
      `${label} presence report`,
      ``,
      `Exposure score: ${dash.exposureScore}/100`,
      `Risk score:     ${dash.riskScore}/100`,
      ``,
      `Public profiles: ${dash.counts.profiles}`,
      `Public emails:   ${dash.counts.publicEmails}`,
      `Public phones:   ${dash.counts.publicPhones}`,
      `Public addresses:${dash.counts.publicAddresses}`,
      ``,
      `Since last ${period === 'weekly' ? 'week' : 'month'}: ` +
        `${added} new finding(s), ${removed} removed.`,
      ``,
      dash.topRisks.length
        ? `Top risk: ${dash.topRisks[0].title ?? dash.topRisks[0].url}`
        : `No findings yet — add and verify an identity, then run a scan.`,
    ].join('\n');
  }

  /** Generates and delivers reports for every consenting user (scheduled job). */
  async runForAllUsers(period: Period): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { consentGivenAt: { not: null } },
      select: { id: true },
    });
    for (const { id } of users) {
      try {
        const text = await this.buildForUser(id, period);
        await this.notifications.create({
          userId: id,
          type: 'report',
          title: `Your ${period} presence report`,
          body: text,
          email: true,
        });
      } catch (err) {
        this.logger.error(`Report failed for ${id}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`${period} reports delivered to ${users.length} user(s).`);
  }
}
