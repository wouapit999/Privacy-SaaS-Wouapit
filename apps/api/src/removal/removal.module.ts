import { Module } from '@nestjs/common';
import { RemovalController } from './removal.controller';
import { RemovalService } from './removal.service';

@Module({
  controllers: [RemovalController],
  providers: [RemovalService],
})
export class RemovalModule {}
