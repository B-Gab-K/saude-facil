import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { AuditService } from './audit.service';

@Injectable()
export class LegacyArchiveService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly audit: AuditService) {}
  async onModuleInit() {
    // Archive the old demonstration without assigning records to accounts or real slots.
    let cursor: string | undefined;
    for (;;) {
      const records = await this.prisma.appointment.findMany({ orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      if (!records.length) break;
      for (const item of records) {
        if (item.paciente && typeof item.paciente === 'object' && !Array.isArray(item.paciente) && 'sealed' in item.paciente) continue;
        await this.prisma.$transaction(async tx => {
          await tx.appointment.update({ where: { id: item.id }, data: { paciente: { sealed: this.crypto.encrypt(item.paciente, `legacy-patient:${item.id}`) }, triagemResumo: this.crypto.encrypt(item.triagemResumo, `legacy-reason:${item.id}`), observacao: this.crypto.encrypt(item.observacao, `legacy-note:${item.id}`), atualizadoEm: item.atualizadoEm } });
          await this.audit.record(null, 'LEGACY_RECORD_SEALED', item.id, {}, tx);
        });
      }
      cursor = records[records.length - 1].id;
    }
  }
}
