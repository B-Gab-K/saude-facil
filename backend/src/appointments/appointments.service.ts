import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma, Role, User } from '../../generated/prisma';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../platform/audit.service';
import { CryptoService } from '../platform/crypto.service';
import { Profile } from '../auth/access';
import { AppointmentPolicy } from './appointment-status';
import { AppointmentsStore, bookingInclude, BookingRecord } from './appointments.repository';
import { AppointmentQuery, CreateAppointmentDto, RescheduleDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly repository: AppointmentsStore, private readonly policy: AppointmentPolicy, private readonly crypto: CryptoService, private readonly audit: AuditService) {}
  async list(actor: User, query: AppointmentQuery) {
    if (query.from && query.to && new Date(query.to) <= new Date(query.from)) throw new BadRequestException('Intervalo de consulta inválido.');
    const conditions: Prisma.BookingWhereInput[] = [this.policy.scope(actor), { status: query.status,
      slot: { serviceId: query.serviceId, service: { unitId: query.unitId }, startsAt: { gte: query.from ? new Date(query.from) : undefined, lt: query.to ? new Date(query.to) : undefined } } }];
    if (query.q?.trim()) {
      const q = query.q.trim(), terms = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(word => word.length >= 3);
      conditions.push({ OR: [{ code: { contains: q, mode: 'insensitive' } }, { slot: { service: { unit: { name: { contains: q, mode: 'insensitive' } } } } },
        ...(terms.length ? [{ patient: { searchTokens: { hasEvery: terms.map(term => this.crypto.lookup(term, 'name')) } } }] : []),
      ] });
    }
    const orderBy: Prisma.BookingOrderByWithRelationInput[] = [query.sort === 'startsAt' ? { slot: { startsAt: query.order } } : { createdAt: query.order }, { id: 'asc' }];
    const result = await this.repository.list({ AND: conditions }, orderBy, (query.page - 1) * query.limit, query.limit);
    await this.audit.record(actor.id, 'BOOKINGS_READ', undefined, { ids: result.items.map(item => item.id) });
    return { items: result.items.map(item => this.view(actor, item)), total: result.total, page: query.page, limit: query.limit };
  }
  async detail(actor: User, id: string) {
    const item = await this.repository.read(id, this.policy.scope(actor));
    await this.audit.record(actor.id, 'BOOKING_READ', id); return this.view(actor, item);
  }
  async create(actor: User, dto: CreateAppointmentDto) {
    if (actor.role !== Role.PATIENT || !actor.verifiedAt) throw new ForbiddenException('O agendamento requer conta de paciente com identidade conferida pela unidade.');
    const id = randomUUID();
    return this.repository.transact(async tx => {
      const slot = await this.repository.availableSlot(tx, dto.slotId, actor.id);
      const patient = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
      if (!patient.verifiedAt || patient.disabled) throw new ForbiddenException('Conta indisponível para agendamento.');
      const item = await tx.booking.create({ data: { id, patientId: actor.id, slotId: slot.id, reasonCipher: this.crypto.encrypt(dto.reason.trim(), `reason:${id}`), noteCipher: this.crypto.encrypt('', `note:${id}`) }, include: bookingInclude });
      await this.audit.record(actor.id, 'BOOKING_CREATED', id, { slotId: slot.id }, tx); return this.view(actor, item);
    });
  }
  async update(actor: User, id: string, dto: UpdateAppointmentDto) {
    return this.repository.transact(async tx => {
      const current = await this.current(tx, actor, id, dto.version);
      this.policy.transition(actor, current.status, dto.status, current.slot.startsAt);
      if (actor.role === Role.PATIENT && dto.observation !== undefined) throw new ForbiddenException('Observações são exclusivas da equipe.');
      const item = await tx.booking.update({ where: { id, version: dto.version }, data: { status: dto.status, version: { increment: 1 }, ...(dto.observation !== undefined ? { noteCipher: this.crypto.encrypt(dto.observation.trim(), `note:${id}`) } : {}) }, include: bookingInclude });
      await this.audit.record(actor.id, 'BOOKING_STATUS_CHANGED', id, { from: current.status, to: item.status }, tx); return this.view(actor, item);
    });
  }
  async reschedule(actor: User, id: string, dto: RescheduleDto) {
    return this.repository.transact(async tx => {
      const current = await this.current(tx, actor, id, dto.version);
      this.policy.reschedule(actor, current.status, current.slot.startsAt);
      if (current.slotId === dto.slotId) throw new BadRequestException('Selecione um horário diferente.');
      const slot = await this.repository.availableSlot(tx, dto.slotId, current.patientId, id);
      if (slot.serviceId !== current.slot.serviceId) throw new BadRequestException('O reagendamento deve manter a unidade e o serviço.');
      const item = await tx.booking.update({ where: { id, version: dto.version }, data: { slotId: slot.id, status: BookingStatus.CONFIRMED, version: { increment: 1 } }, include: bookingInclude });
      await this.audit.record(actor.id, 'BOOKING_RESCHEDULED', id, { fromSlot: current.slotId, toSlot: slot.id }, tx); return this.view(actor, item);
    });
  }
  private async current(tx: Prisma.TransactionClient, actor: User, id: string, version: number) {
    const item = await tx.booking.findFirst({ where: { AND: [{ id }, this.policy.scope(actor)] }, include: bookingInclude });
    if (!item) throw new NotFoundException('Agendamento não encontrado.');
    if (item.version !== version) throw new ConflictException('Registro alterado por outra pessoa. Atualize a página.'); return item;
  }
  private view(actor: User, item: BookingRecord) {
    const profile = this.crypto.decrypt<Profile>(item.patient.profileCipher, `user:${item.patientId}`), timezone = item.slot.service.unit.timezone;
    const clinical = actor.role === Role.NURSE || actor.role === Role.ADMIN || actor.role === Role.PATIENT;
    return { id: item.id, codigo: item.code, status: item.status, version: item.version, slotId: item.slotId,
      unitId: item.slot.service.unitId, serviceId: item.slot.serviceId, ubs: item.slot.service.unit.name, servico: item.slot.service.name,
      data: new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(item.slot.startsAt),
      hora: new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(item.slot.startsAt),
      startsAt: item.slot.startsAt, endsAt: item.slot.endsAt, timezone, paciente: { nome: profile.nome },
      triagemResumo: clinical && !item.sensitivePurgedAt ? this.crypto.decrypt<string>(item.reasonCipher, `reason:${item.id}`) : '',
      observacao: !item.sensitivePurgedAt ? this.crypto.decrypt<string>(item.noteCipher, `note:${item.id}`) : '',
      criadoEm: item.createdAt, atualizadoEm: item.updatedAt, sensitivePurgedAt: item.sensitivePurgedAt };
  }
}
