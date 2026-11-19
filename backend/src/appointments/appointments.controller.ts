import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '../../generated/prisma';
import { AuthRequest, Roles } from '../auth/access';
import { AppointmentsService } from './appointments.service';
import { AppointmentQuery, CreateAppointmentDto, RescheduleDto, UpdateAppointmentDto } from './dto/appointment.dto';
@Controller('api/solicitacoes')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: AppointmentQuery) { return this.appointments.list(req.actor, query); }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.appointments.detail(req.actor, id); }
  @Roles(Role.PATIENT) @Post() create(@Req() req: AuthRequest, @Body() dto: CreateAppointmentDto) { return this.appointments.create(req.actor, dto); }
  @Patch(':id') update(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAppointmentDto) { return this.appointments.update(req.actor, id, dto); }
  @Post(':id/reschedule') reschedule(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RescheduleDto) { return this.appointments.reschedule(req.actor, id, dto); }
}
