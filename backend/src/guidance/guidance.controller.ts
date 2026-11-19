import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Role } from '../../generated/prisma';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthRequest, Public, Roles } from '../auth/access';
import { GuidanceService } from './guidance.service';

export class ReviewDto {
  @IsString() @MinLength(20) @MaxLength(1000) evidence!: string;
  @IsDateString({ strict: true }) expiresAt!: string;
}
@Controller('api/guidance')
export class GuidanceController {
  constructor(private readonly guidance: GuidanceService) {}
  @Public() @Get() policy() { return this.guidance.policy(); }
  @Roles(Role.NURSE) @Post('reviews') approve(@Req() req: AuthRequest, @Body() dto: ReviewDto) { return this.guidance.approve(req.actor, dto); }
  @Roles(Role.NURSE, Role.ADMIN) @Post('reviews/:id/revoke') revoke(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.guidance.revoke(req.actor, id); }
}
