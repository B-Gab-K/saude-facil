import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Controller('api/solicitacoes')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list() { return this.appointments.list(); }

  @Post()
  create(@Body() body: CreateAppointmentDto) { return this.appointments.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateAppointmentDto) { return this.appointments.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.appointments.delete(id); }
}
