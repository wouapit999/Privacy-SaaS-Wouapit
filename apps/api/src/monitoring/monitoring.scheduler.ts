import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { MONITORING_QUEUE, MonitoringJob, MonitoringJobName } from './monitoring.constants';

/**
 * Owns the monitoring queue and registers the repeatable job schedulers
 * (daily scan, weekly/monthly reports) on boot. Schedulers are idempotent —
 * re-registering with the same id updates rather than duplicates them.
 */
@Injectable()
export class MonitoringScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringScheduler.name);
  readonly queue: Queue;

  constructor(private readonly config: ConfigService) {
    this.queue = new Queue(MONITORING_QUEUE, {
      connection: config.get('redis.connection')!,
      defaultJobOptions: { removeOnComplete: 200, removeOnFail: 200 },
    });
  }

  async onModuleInit() {
    if (!this.config.get<boolean>('monitoring.enabled')) {
      this.logger.warn('Monitoring schedulers disabled (MONITORING_ENABLED=false).');
      return;
    }
    await this.register('daily-scan', this.config.get('monitoring.dailyScanCron')!, MonitoringJob.DailyScan);
    await this.register('weekly-report', this.config.get('monitoring.weeklyReportCron')!, MonitoringJob.WeeklyReport);
    await this.register('monthly-report', this.config.get('monitoring.monthlyReportCron')!, MonitoringJob.MonthlyReport);
    this.logger.log('Monitoring schedulers registered.');
  }

  private async register(id: string, pattern: string, name: MonitoringJobName) {
    await this.queue.upsertJobScheduler(id, { pattern }, { name, data: {} });
  }

  /** Enqueues an immediate one-off run (used by the manual-trigger endpoint). */
  async triggerNow(name: MonitoringJobName) {
    return this.queue.add(name, { manual: true });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
