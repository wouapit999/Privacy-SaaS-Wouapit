import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { configuration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { IdentityModule } from './identity/identity.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { ScanModule } from './scan/scan.module';
import { RiskModule } from './risk/risk.module';
import { RemovalModule } from './removal/removal.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MonitorModule } from './monitor/monitor.module';
import { CopilotModule } from './copilot/copilot.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AccountModule } from './account/account.module';
import { BrokersModule } from './brokers/brokers.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Per-IP rate limiting: 100 requests / 60s by default.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    IdentityModule,
    DiscoveryModule,
    ScanModule,
    RiskModule,
    RemovalModule,
    DashboardModule,
    MonitorModule,
    CopilotModule,
    NotificationsModule,
    MonitoringModule,
    AccountModule,
    BrokersModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
