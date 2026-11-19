import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../generated/prisma';
import { AuthRequest, Public, Roles } from '../auth/access';
import { AppointmentQuery } from '../appointments/dto/appointment.dto';
import { OperationsService } from './operations.service';
export class RetentionDto { @IsString() @MinLength(10) @MaxLength(200) policyReference!: string }
@Controller('api/operations')
export class OperationsController {
  constructor(private readonly ops: OperationsService) {}
  @Public() @Get('health') health() { return this.ops.health(); }
  @Roles(Role.ADMIN) @Get('metrics') metrics(@Req() req: AuthRequest) { return this.ops.metrics(req.actor); }
  @Roles(Role.ADMIN) @Get('audit') audit(@Req() req: AuthRequest, @Query() query: AppointmentQuery) { return this.ops.auditEvents(req.actor, query); }
  @Roles(Role.ADMIN) @Get('retention') preview(@Req() req: AuthRequest) { return this.ops.preview(req.actor); }
  @Roles(Role.ADMIN) @Post('retention') purge(@Req() req: AuthRequest, @Body() dto: RetentionDto) { return this.ops.purge(req.actor, dto.policyReference); }
}
