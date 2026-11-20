import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../platform/crypto.service';
import { AuditService } from '../platform/audit.service';
import { Profile } from '../auth/access';
import { NotificationTransport } from './notification.transport';

@Injectable()
export class NotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly audit: AuditService, private readonly transport: NotificationTransport) {}
  onModuleInit() {
    if (!this.transport.enabled) return;
    this.timer = setInterval(() => { this.tick().catch(() => process.stderr.write('{"event":"notification_worker_error"}\n')); }, 3000); this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async tick() {
    if (this.running || !this.transport.enabled) return; this.running = true;
    try {
      const token = randomUUID(), leaseUntil = new Date(Date.now() + 5 * 60000);
      const claimed = await this.prisma.$queryRaw<{ id: string }[]>`UPDATE "Notification" SET status = 'PROCESSING', "leaseToken" = ${token}, "leaseUntil" = ${leaseUntil}, attempts = attempts + 1 WHERE id IN (SELECT id FROM "Notification" WHERE (status = 'PENDING' AND "availableAt" <= NOW() OR status = 'PROCESSING' AND "leaseUntil" < NOW()) AND attempts < 5 ORDER BY "createdAt" LIMIT 5 FOR UPDATE SKIP LOCKED) RETURNING id`;
      for (const { id } of claimed) {
        const notification = await this.prisma.notification.findUniqueOrThrow({ where: { id }, include: { user: true } });
        if (notification.leaseToken !== token) continue;
        const user = notification.user;
        if (!user.emailConsentAt || user.disabled || (notification.kind !== 'VERIFY_EMAIL' && !user.emailVerifiedAt) || notification.status !== 'PROCESSING') {
          await this.prisma.notification.updateMany({ where: { id, leaseToken: token }, data: { status: 'CANCELLED', payloadCipher: this.crypto.encrypt({}, 'notification') } }); continue;
        }
        try {
          let text = 'Há uma atualização na sua conta do Saúde Fácil. Entre no portal para consultar os detalhes. Não responda a este e-mail.';
          if (notification.kind === 'VERIFY_EMAIL') {
            const { token: code } = this.crypto.decrypt<{ token: string }>(notification.payloadCipher, 'notification');
            if (!code || !await this.prisma.emailVerification.findFirst({ where: { tokenHash: this.crypto.digest(code), expiresAt: { gt: new Date() } } })) throw new Error('Confirmação expirada.');
            text = `Você solicitou avisos do Saúde Fácil. Na página Minha conta, confirme este código: ${code}\nO código expira em 24 horas. Se não solicitou, ignore esta mensagem.`;
          }
          const profile = this.crypto.decrypt<Profile>(user.profileCipher, `user:${user.id}`);
          await this.transport.send(profile.email, text, id);
          await this.prisma.$transaction(async tx => {
            await tx.notification.updateMany({ where: { id, leaseToken: token, status: 'PROCESSING' }, data: { status: 'SENT', sentAt: new Date(), leaseUntil: null, payloadCipher: this.crypto.encrypt({}, 'notification') } });
            await this.audit.record(null, 'NOTIFICATION_SENT', id, {}, tx);
          });
        } catch {
          await this.prisma.notification.updateMany({ where: { id, leaseToken: token, status: 'PROCESSING' }, data: { status: notification.attempts >= 5 ? 'FAILED' : 'PENDING', ...(notification.attempts >= 5 ? { payloadCipher: this.crypto.encrypt({}, 'notification') } : {}), availableAt: new Date(Date.now() + 2 ** notification.attempts * 60000), leaseUntil: null } });
        }
      }
      await this.prisma.notification.updateMany({ where: { status: 'PROCESSING', leaseUntil: { lt: new Date() }, attempts: { gte: 5 } }, data: { status: 'FAILED' } });
    } finally { this.running = false; }
  }
}
