import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

export async function serializable<T>(prisma: PrismaService, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await prisma.$transaction(operation, { isolationLevel: 'Serializable', timeout: 10000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034' && attempt < 3) continue;
        if (['P2002', 'P2034', 'P2004'].includes(error.code)) throw new ConflictException('O registro ou horário foi alterado. Atualize a página e tente novamente.');
      }
      throw error;
    }
  }
  throw new ConflictException('Operação concorrente. Tente novamente.');
}
