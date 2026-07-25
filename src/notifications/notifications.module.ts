import { Global, Module } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  providers: [NotificationsService, FcmService],
  exports: [NotificationsService, FcmService],
})
export class NotificationsModule {}
