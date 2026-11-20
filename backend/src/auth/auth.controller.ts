import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, Res } from '@nestjs/common';
import { Role } from '../../generated/prisma';
import { AuthRequest, CookieResponse, Public, Roles } from './access';
import { AuthService } from './auth.service';
import { IdentityDto, LoginDto, PasswordDto, RegisterDto, StaffDto, VerificationDto } from './auth.dto';

@Controller('api')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Post('auth/register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Public() @Post('auth/login') login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: CookieResponse) { return this.auth.login(dto, response); }
  @Get('auth/me') me(@Req() req: AuthRequest) { return { user: this.auth.view(req.actor), csrf: req.csrf }; }
  @Roles(Role.PATIENT) @Post('auth/identity') identity(@Req() req: AuthRequest, @Body() dto: IdentityDto) { return this.auth.identity(req.actor, dto); }
  @Post('auth/logout') logout(@Req() req: AuthRequest, @Res({ passthrough: true }) response: CookieResponse) { return this.auth.logout(req.actor, req.sessionId, response); }
  @Post('auth/password') password(@Req() req: AuthRequest, @Body() dto: PasswordDto, @Res({ passthrough: true }) response: CookieResponse) { return this.auth.changePassword(req.actor, dto, response); }
  @Roles(Role.ADMIN) @Post('users/staff') staff(@Req() req: AuthRequest, @Body() dto: StaffDto) { return this.auth.createStaff(req.actor, dto); }
  @Roles(Role.ADMIN) @Patch('users/:id/disable') disable(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.auth.disable(req.actor, id); }
  @Roles(Role.ADMIN, Role.RECEPTION, Role.COORDINATOR) @Get('users/pending') pending(@Req() req: AuthRequest) { return this.auth.pending(req.actor); }
  @Roles(Role.ADMIN, Role.RECEPTION, Role.COORDINATOR) @Post('users/:id/verify') verify(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: VerificationDto) { return this.auth.verify(req.actor, id, dto.evidence); }
}
