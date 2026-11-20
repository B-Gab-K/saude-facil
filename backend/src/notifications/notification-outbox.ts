import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { CryptoService } from '../platform/crypto.service';
@Injectable()
export class NotificationOutbox {
  constructor(private readonly crypto: CryptoService) {}
  async booking(tx: Prisma.TransactionClient, userId: string, bookingId: string, version: number) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.emailConsentAt || !user.emailVerifiedAt || user.disabled) return;
    const dedupeKey = `${bookingId}:${version}:email`;
    await tx.notification.upsert({ where: { dedupeKey }, update: {}, create: { userId, kind: 'BOOKING_UPDATED', dedupeKey, payloadCipher: this.crypto.encrypt({}, 'notification') } });
  }
}
