import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../platform/audit.service';
import { serializable } from '../platform/transaction';
import { ServiceDto, SlotDto, SlotQuery, UnitDto } from './catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  scope(actor: User) { return actor.role === Role.ADMIN ? {} : { id: actor.unitId || '' }; }
  units() {
    return this.prisma.healthUnit.findMany({ where: { active: true, verifiedAt: { not: null } }, select: { id: true, name: true, address: true, timezone: true, sourceUrl: true, verifiedAt: true, services: { where: { active: true, verifiedAt: { not: null } }, select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
  }
  async drafts(actor: User) {
    const units = await this.prisma.healthUnit.findMany({ where: this.scope(actor), include: { services: true }, take: 100, orderBy: { name: 'asc' } });
    await this.audit.record(actor.id, 'CATALOG_MANAGEMENT_READ'); return units;
  }
  async createUnit(actor: User, dto: UnitDto) {
    return this.prisma.$transaction(async tx => {
      const unit = await tx.healthUnit.create({ data: { name: dto.name.trim(), address: dto.address.trim(), sourceUrl: dto.sourceUrl } });
      await this.audit.record(actor.id, 'UNIT_CREATED', unit.id, {}, tx); return unit;
    });
  }
  async approveUnit(actor: User, id: string, evidence: string) {
    return this.prisma.$transaction(async tx => {
      const unit = await tx.healthUnit.findFirst({ where: { AND: [{ id }, this.scope(actor)] } });
      if (!unit) throw new NotFoundException('Unidade não encontrada.');
      const updated = await tx.healthUnit.update({ where: { id }, data: { active: true, verifiedAt: new Date(), verifiedBy: actor.id } });
      await this.audit.record(actor.id, 'UNIT_APPROVED', id, { evidence, sourceUrl: unit.sourceUrl }, tx); return updated;
    });
  }
  async createService(actor: User, dto: ServiceDto) {
    const unit = await this.prisma.healthUnit.findFirst({ where: { AND: [{ id: dto.unitId }, this.scope(actor)] } });
    if (!unit) throw new NotFoundException('Unidade não encontrada.');
    return serializable(this.prisma, async tx => {
      const service = await tx.careService.create({ data: { unitId: dto.unitId, name: dto.name.trim(), evidence: dto.evidence } });
      await this.audit.record(actor.id, 'SERVICE_CREATED', service.id, {}, tx); return service;
    });
  }
  async approveService(actor: User, id: string, evidence: string) {
    return this.prisma.$transaction(async tx => {
      const service = await tx.careService.findFirst({ where: { id, unit: this.scope(actor) }, include: { unit: true } });
      if (!service) throw new NotFoundException('Serviço não encontrado.');
      if (!service.unit.active || !service.unit.verifiedAt) throw new BadRequestException('Valide a unidade antes de publicar serviços.');
      const updated = await tx.careService.update({ where: { id }, data: { active: true, verifiedAt: new Date(), verifiedBy: actor.id, evidence } });
      await this.audit.record(actor.id, 'SERVICE_APPROVED', id, { evidence }, tx); return updated;
    });
  }
  async createSlot(actor: User, dto: SlotDto) {
    const startsAt = new Date(dto.startsAt), endsAt = new Date(dto.endsAt);
    if (startsAt <= new Date() || endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > 8 * 3600_000) throw new BadRequestException('Horário inválido: informe início futuro e duração de até 8 horas.');
    return serializable(this.prisma, async tx => {
      const service = await tx.careService.findFirst({ where: { id: dto.serviceId, active: true, verifiedAt: { not: null }, unit: { ...this.scope(actor), active: true, verifiedAt: { not: null } } } });
      if (!service) throw new NotFoundException('Serviço validado não encontrado.');
      const resource = `${service.unitId}:${dto.resource.toLowerCase()}`;
      const overlap = await tx.scheduleSlot.count({ where: { resource, active: true, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (overlap) throw new ConflictException('O recurso já possui um horário nesse intervalo.');
      const slot = await tx.scheduleSlot.create({ data: { serviceId: service.id, resource, startsAt, endsAt, createdBy: actor.id } });
      await this.audit.record(actor.id, 'SLOT_CREATED', slot.id, {}, tx); return slot;
    });
  }
  async available(query: SlotQuery) {
    const from = query.from ? new Date(query.from) : new Date(), to = query.to ? new Date(query.to) : new Date(Date.now() + 90 * 86400_000);
    if (from < new Date(Date.now() - 60_000) || to <= from || to.getTime() - from.getTime() > 90 * 86400_000) throw new BadRequestException('Consulte um período futuro de até 90 dias.');
    const where = { active: true, startsAt: { gte: from, lt: to }, serviceId: query.serviceId,
      service: { active: true, verifiedAt: { not: null }, unit: { id: query.unitId, active: true, verifiedAt: { not: null } } },
      bookings: { none: { status: { not: 'CANCELLED' as const } } } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.scheduleSlot.findMany({ where, select: { id: true, serviceId: true, startsAt: true, endsAt: true }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.scheduleSlot.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async closeSlot(actor: User, id: string) {
    return serializable(this.prisma, async tx => {
      const slot = await tx.scheduleSlot.findFirst({ where: { id, service: { unit: this.scope(actor) } }, include: { bookings: { where: { status: { not: 'CANCELLED' } } } } });
      if (!slot) throw new NotFoundException('Horário não encontrado.');
      if (slot.bookings.length) throw new ConflictException('Cancele ou reagende o atendimento antes de fechar o horário.');
      await tx.scheduleSlot.update({ where: { id }, data: { active: false } });
      await this.audit.record(actor.id, 'SLOT_CLOSED', id, {}, tx); return { ok: true };
    });
  }
}
