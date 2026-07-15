import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailProvider } from './mail.provider';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, MailProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
