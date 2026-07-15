import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { SCAN_QUEUE, ScanJobData } from './scan.constants';

@Injectable()
export class ScanQueue implements OnModuleDestroy {
  readonly queue: Queue<ScanJobData>;

  constructor(config: ConfigService) {
    this.queue = new Queue<ScanJobData>(SCAN_QUEUE, {
      connection: config.get('redis.connection')!,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
  }

  add(data: ScanJobData) {
    return this.queue.add('scan', data);
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
