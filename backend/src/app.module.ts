import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { PlatformModule } from './platform/platform.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { GuidanceController } from './guidance/guidance.controller';
import { GuidanceService } from './guidance/guidance.service';
import { OperationsController } from './operations/operations.controller';
import { OperationsService } from './operations/operations.service';
import { NotificationsModule } from './notifications/notifications.module';

@Module({ imports: [PlatformModule, AuthModule, NotificationsModule, CatalogModule, AppointmentsModule], controllers: [GuidanceController, OperationsController], providers: [GuidanceService, OperationsService] })
export class AppModule {}
