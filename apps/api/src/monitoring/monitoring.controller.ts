import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/rbac/roles.guard';
import { Roles } from '../common/rbac/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringScheduler } from './monitoring.scheduler';
import { MonitoringSweep, SweepOutcome } from './monitoring.sweep';
import { ReportService } from './report.service';
import { MonitoringJob } from './monitoring.constants';

class TriggerDto {
  @IsIn(['daily-scan', 'weekly-report', 'monthly-report'])
  job!: (typeof MonitoringJob)[keyof typeof MonitoringJob];
}

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly scheduler: MonitoringScheduler,
    private readonly sweep: MonitoringSweep,
    private readonly reports: ReportService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Run monitoring for the caller's own identities immediately (no waiting for
   * cron). Great for testing the sweep + notifications path.
   */
  @Post('run')
  async runMine(@CurrentUser() user: AuthenticatedUser) {
    const identities = await this.prisma.verifiedIdentity.findMany({
      where: { userId: user.userId, verifiedAt: { not: null } },
      select: { id: true },
    });
    const outcomes: SweepOutcome[] = [];
    for (const { id } of identities) {
      outcomes.push(await this.sweep.sweepIdentity(user.userId, id));
    }
    return { swept: outcomes.length, outcomes };
  }

  /** Preview the caller's weekly report text without emailing it. */
  @Post('report/preview')
  previewReport(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.buildForUser(user.userId, 'weekly').then((text) => ({ text }));
  }

  /** ADMIN-only: enqueue a global scheduled job right now. */
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Post('trigger')
  trigger(@Body() dto: TriggerDto) {
    return this.scheduler.triggerNow(dto.job).then((j) => ({ enqueued: j.id, job: dto.job }));
  }
}
