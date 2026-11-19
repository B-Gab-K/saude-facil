import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository, AppointmentsStore } from './appointments.repository';
import { AppointmentPolicy } from './appointment-status';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController],
  providers: [{ provide: AppointmentsStore, useClass: AppointmentsRepository }, AppointmentPolicy, AppointmentsService],
})
export class AppointmentsModule {}
