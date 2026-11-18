import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppointmentStatus } from './appointment-status';
import { AppointmentsRepository } from './appointments.repository';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly repository: AppointmentsRepository) {}

  list() {
    return this.repository.list();
  }

  async create(dto: CreateAppointmentDto) {
    try {
      return await this.repository.create({
        id: dto.id.trim(), codigo: dto.codigo.trim(), ubs: dto.ubs.trim(),
        servico: dto.servico.trim(), data: dto.data, hora: 'A confirmar',
        status: AppointmentStatus.RECEIVED,
        paciente: { nome: dto.paciente.nome.trim(), cpf: dto.paciente.cpf, nasc: dto.paciente.nasc, sus: dto.paciente.sus ?? '' },
        triagemResumo: dto.triagemResumo.trim(), observacao: '',
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma solicitação com este identificador.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const data: Prisma.AppointmentUpdateManyMutationInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.data !== undefined) data.data = dto.data;
    if (dto.ubs !== undefined) data.ubs = dto.ubs.trim();
    if (dto.servico !== undefined) data.servico = dto.servico.trim();
    if (dto.observacao !== undefined) data.observacao = dto.observacao.trim();
    if (!Object.keys(data).length) throw new BadRequestException('Informe ao menos um campo para atualizar.');

    const result = await this.repository.updateOpen(id, data);
    if (!result.appointment) throw new NotFoundException('Solicitação não encontrada.');
    if (!result.updated) throw new ConflictException('Solicitação encerrada.');
    return result.appointment;
  }

  async delete(id: string) {
    if (!await this.repository.delete(id)) throw new NotFoundException('Solicitação não encontrada.');
    return { ok: true };
  }
}
