import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { terminalStatuses } from './appointment-status';

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.appointment.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  create(data: Prisma.AppointmentCreateInput) {
    return this.prisma.appointment.create({ data });
  }

  updateOpen(id: string, data: Prisma.AppointmentUpdateManyMutationInput) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.appointment.updateMany({
        where: { id, status: { notIn: terminalStatuses } }, data,
      });
      const appointment = await transaction.appointment.findUnique({ where: { id } });
      return { updated: result.count === 1, appointment };
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.appointment.deleteMany({ where: { id } });
    return result.count === 1;
  }
}
