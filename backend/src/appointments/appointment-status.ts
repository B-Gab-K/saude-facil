import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { BookingStatus, Role, User } from '../../generated/prisma';

export const terminalStatuses: BookingStatus[] = [BookingStatus.COMPLETED, BookingStatus.CANCELLED];
const transitions: Record<BookingStatus, BookingStatus[]> = {
  CONFIRMED: [BookingStatus.IN_REVIEW, BookingStatus.RESCHEDULE_REQUESTED, BookingStatus.CANCELLED],
  IN_REVIEW: [BookingStatus.COMPLETED, BookingStatus.RESCHEDULE_REQUESTED, BookingStatus.CANCELLED],
  RESCHEDULE_REQUESTED: [BookingStatus.CANCELLED], COMPLETED: [], CANCELLED: [],
};
@Injectable()
export class AppointmentPolicy {
  transition(actor: User, from: BookingStatus, to: BookingStatus, startsAt: Date) {
    if (!transitions[from].includes(to)) throw new ConflictException('Mudança de situação não permitida.');
    if (actor.role === Role.PATIENT && to !== BookingStatus.CANCELLED) throw new ForbiddenException('Use o reagendamento para escolher um novo horário.');
    if (to === BookingStatus.COMPLETED && actor.role !== Role.NURSE && actor.role !== Role.ADMIN) throw new ForbiddenException('A finalização requer perfil assistencial.');
    if (to === BookingStatus.COMPLETED && startsAt > new Date()) throw new ConflictException('Não é possível finalizar atendimento antes do início.');
    if (actor.role === Role.PATIENT && startsAt <= new Date()) throw new ConflictException('Contate a unidade para alterar um atendimento já iniciado.');
  }
  reschedule(actor: User, status: BookingStatus, startsAt: Date) {
    if (terminalStatuses.includes(status)) throw new ConflictException('Atendimento encerrado.');
    if (actor.role === Role.PATIENT && startsAt <= new Date()) throw new ConflictException('Contate a unidade para reagendar um atendimento já iniciado.');
  }
  scope(actor: User) {
    if (actor.role === Role.PATIENT) return { patientId: actor.id };
    return actor.role === Role.ADMIN ? {} : { slot: { service: { unitId: actor.unitId || '' } } };
  }
}
