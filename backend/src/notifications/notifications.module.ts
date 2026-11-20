import { Global, Module } from '@nestjs/common';
import { NotificationTransport, SmtpNotificationTransport } from './notification.transport';
import { NotificationOutbox } from './notification-outbox';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';
import { NotificationsController } from './notifications.controller';
@Global()
@Module({ controllers: [NotificationsController], providers: [NotificationOutbox, NotificationsService, NotificationsWorker, { provide: NotificationTransport, useClass: SmtpNotificationTransport }], exports: [NotificationOutbox, NotificationsService] })
export class NotificationsModule {}
