import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../platform/crypto.service';
import { AuditService } from '../platform/audit.service';
import { NotificationTransport } from './notification.transport';
import { serializable } from '../platform/transaction';
export const CONSENT_VERSION = 'email-generic-updates-v1';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly audit: AuditService, private readonly transport: NotificationTransport) {}
  status(user: User) { return { available: this.transport.enabled, consented: !!user.emailConsentAt, verified: !!user.emailVerifiedAt, consentVersion: CONSENT_VERSION }; }
  async consent(user: User, enabled: boolean) {
    if (enabled && !this.transport.enabled) throw new ServiceUnavailableException('Os avisos por e-mail ainda não foram ativados pela instituição.');
    return serializable(this.prisma, async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (enabled && !current.emailVerifiedAt && current.lastEmailVerificationAt && current.lastEmailVerificationAt.getTime() > Date.now() - 60000) throw new ConflictException('Aguarde um minuto antes de solicitar outro e-mail.');
      await tx.emailVerification.deleteMany({ where: { userId: user.id } });
      await tx.notification.updateMany({ where: { userId: user.id, status: { in: ['PENDING', 'PROCESSING'] } }, data: { status: 'CANCELLED', payloadCipher: this.crypto.encrypt({}, 'notification') } });
      const updated = await tx.user.update({ where: { id: user.id }, data: { emailConsentAt: enabled ? new Date() : null, consentVersion: enabled ? CONSENT_VERSION : null, ...(enabled && !current.emailVerifiedAt ? { lastEmailVerificationAt: new Date() } : {}) } });
      if (enabled && !current.emailVerifiedAt) {
        const token = this.crypto.token(), id = randomUUID();
        await tx.emailVerification.create({ data: { userId: user.id, tokenHash: this.crypto.digest(token), expiresAt: new Date(Date.now() + 24 * 3600000) } });
        await tx.notification.create({ data: { id, userId: user.id, kind: 'VERIFY_EMAIL', dedupeKey: id, payloadCipher: this.crypto.encrypt({ token }, 'notification') } });
      }
      await this.audit.record(user.id, enabled ? 'EMAIL_CONSENT_GRANTED' : 'EMAIL_CONSENT_REVOKED', user.id, { version: CONSENT_VERSION }, tx);
      return this.status(updated);
    });
  }
  async verify(user: User, token: string) {
    return serializable(this.prisma, async tx => {
      const verification = await tx.emailVerification.findFirst({ where: { tokenHash: this.crypto.digest(token), userId: user.id, expiresAt: { gt: new Date() } } });
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!verification || !current.emailConsentAt) throw new BadRequestException('Código expirado ou inválido. Solicite uma nova confirmação.');
      const updated = await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      await tx.emailVerification.deleteMany({ where: { userId: user.id } });
      await this.audit.record(user.id, 'EMAIL_VERIFIED', user.id, {}, tx); return this.status(updated);
    });
  }
}
