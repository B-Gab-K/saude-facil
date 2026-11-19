import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Role } from '../../generated/prisma';
import { AuthRequest, Public, Roles } from '../auth/access';
import { ApprovalDto, ServiceDto, SlotDto, SlotQuery, UnitDto } from './catalog.dto';
import { CatalogService } from './catalog.service';

@Controller('api/catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Public() @Get('units') units() { return this.catalog.units(); }
  @Get('slots') slots(@Query() query: SlotQuery) { return this.catalog.available(query); }
  @Roles(Role.ADMIN, Role.COORDINATOR) @Get('management') drafts(@Req() req: AuthRequest) { return this.catalog.drafts(req.actor); }
  @Roles(Role.ADMIN) @Post('units') createUnit(@Req() req: AuthRequest, @Body() dto: UnitDto) { return this.catalog.createUnit(req.actor, dto); }
  @Roles(Role.ADMIN, Role.COORDINATOR) @Post('units/:id/approve') approveUnit(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ApprovalDto) { return this.catalog.approveUnit(req.actor, id, dto.evidence); }
  @Roles(Role.ADMIN, Role.COORDINATOR) @Post('services') createService(@Req() req: AuthRequest, @Body() dto: ServiceDto) { return this.catalog.createService(req.actor, dto); }
  @Roles(Role.ADMIN, Role.COORDINATOR) @Post('services/:id/approve') approveService(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ApprovalDto) { return this.catalog.approveService(req.actor, id, dto.evidence); }
  @Roles(Role.ADMIN, Role.COORDINATOR) @Post('slots') createSlot(@Req() req: AuthRequest, @Body() dto: SlotDto) { return this.catalog.createSlot(req.actor, dto); }
  @Roles(Role.ADMIN, Role.COORDINATOR) @Post('slots/:id/close') closeSlot(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.catalog.closeSlot(req.actor, id); }
}
