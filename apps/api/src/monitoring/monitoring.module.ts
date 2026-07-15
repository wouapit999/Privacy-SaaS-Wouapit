import { Module } from '@nestjs/common';

import { MonitoringController } from './monitoring.controller';
import { MonitoringScheduler } from './monitoring.scheduler';
import { MonitoringProcessor } from './monitoring.processor';
import { MonitoringSweep } from './monitoring.sweep';
import { ReportService } from './report.service';

import { IdentityModule } from '../identity/identity.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [IdentityModule, DiscoveryModule, NotificationsModule, DashboardModule, AiModule],
  controllers: [MonitoringController],
  providers: [MonitoringScheduler, MonitoringProcessor, MonitoringSweep, ReportService],
  exports: [MonitoringSweep, ReportService],
})
export class MonitoringModule {}
