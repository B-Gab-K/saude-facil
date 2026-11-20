import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { IsBoolean, IsString, Matches } from 'class-validator';
import { AuthRequest } from '../auth/access';
import { NotificationsService } from './notifications.service';
class ConsentDto { @IsBoolean() enabled!: boolean }
class VerifyEmailDto { @IsString() @Matches(/^[\w-]{43}$/) token!: string }
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() status(@Req() req: AuthRequest) { return this.notifications.status(req.actor); }
  @Post('consent') consent(@Req() req: AuthRequest, @Body() dto: ConsentDto) { return this.notifications.consent(req.actor, dto.enabled); }
  @Post('verify') verify(@Req() req: AuthRequest, @Body() dto: VerifyEmailDto) { return this.notifications.verify(req.actor, dto.token); }
}
