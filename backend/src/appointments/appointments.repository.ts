import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { serializable } from '../platform/transaction';

export const bookingInclude = { slot: { include: { service: { include: { unit: true } } } }, patient: true } as const;
export type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;
type SlotRecord = Prisma.ScheduleSlotGetPayload<{ include: { service: { include: { unit: true } } } }>;
export abstract class AppointmentsStore {
  abstract read(id: string, scope: Prisma.BookingWhereInput): Promise<BookingRecord>;
  abstract list(where: Prisma.BookingWhereInput, orderBy: Prisma.BookingOrderByWithRelationInput[], skip: number, take: number): Promise<{ items: BookingRecord[]; total: number }>;
  abstract transact<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  abstract availableSlot(tx: Prisma.TransactionClient, slotId: string, patientId: string, excludeId?: string): Promise<SlotRecord>;
}
@Injectable()
export class AppointmentsRepository extends AppointmentsStore {
  constructor(private readonly prisma: PrismaService) { super(); }
  async read(id: string, scope: Prisma.BookingWhereInput) {
    const booking = await this.prisma.booking.findFirst({ where: { AND: [{ id }, scope] }, include: bookingInclude });
    if (!booking) throw new NotFoundException('Agendamento não encontrado.'); return booking;
  }
  async list(where: Prisma.BookingWhereInput, orderBy: Prisma.BookingOrderByWithRelationInput[], skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({ where, include: bookingInclude, orderBy, skip, take }), this.prisma.booking.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return { items, total };
  }
  transact<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) { return serializable(this.prisma, operation); }
  async availableSlot(tx: Prisma.TransactionClient, slotId: string, patientId: string, excludeId?: string) {
    // Serialize bookings for one patient even when different slots are requested.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${patientId} FOR UPDATE`;
    const slot = await tx.scheduleSlot.findUnique({ where: { id: slotId }, include: { service: { include: { unit: true } } } });
    if (!slot || !slot.active || !slot.service.active || !slot.service.verifiedAt || !slot.service.unit.active || !slot.service.unit.verifiedAt || slot.startsAt <= new Date()) throw new ConflictException('Horário indisponível. Escolha outra vaga.');
    const collision = await tx.booking.count({ where: { id: excludeId ? { not: excludeId } : undefined, status: { not: 'CANCELLED' }, OR: [
      { slotId }, { patientId, slot: { startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt } } },
    ] } });
    if (collision) throw new ConflictException('Horário ocupado ou conflitante com outro agendamento do paciente.');
    return slot;
  }
}
