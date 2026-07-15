import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';

import { MONITORING_QUEUE, MonitoringJob } from './monitoring.constants';
import { MonitoringSweep } from './monitoring.sweep';
import { ReportService } from './report.service';

@Injectable()
export class MonitoringProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringProcessor.name);
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly sweep: MonitoringSweep,
    private readonly reports: ReportService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      MONITORING_QUEUE,
      (job) => this.handle(job),
      {
        connection: this.config.get('redis.connection')!,
        concurrency: 1, // scheduled sweeps run one at a time
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Monitoring job ${job?.name} failed: ${err.message}`),
    );
  }

  private async handle(job: Job) {
    switch (job.name) {
      case MonitoringJob.DailyScan:
        return this.sweep.sweepAll();
      case MonitoringJob.WeeklyReport:
        return this.reports.runForAllUsers('weekly');
      case MonitoringJob.MonthlyReport:
        return this.reports.runForAllUsers('monthly');
      default:
        this.logger.warn(`Unknown monitoring job: ${job.name}`);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
