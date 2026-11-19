import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService) {}
  record(actorId: string | null, action: string, targetId?: string, detail: unknown = {}, transaction: Prisma.TransactionClient = this.prisma) {
    return transaction.auditEvent.create({ data: { actorId, action, targetId, detailCipher: this.crypto.encrypt(detail, 'audit') } });
  }
}
