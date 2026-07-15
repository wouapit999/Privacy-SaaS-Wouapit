import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { ScanQueue } from './scan.queue';
import { ScanProcessor } from './scan.processor';
import { IdentityModule } from '../identity/identity.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [IdentityModule, DiscoveryModule, AiModule],
  controllers: [ScanController],
  providers: [ScanService, ScanQueue, ScanProcessor],
  exports: [ScanService],
})
export class ScanModule {}
