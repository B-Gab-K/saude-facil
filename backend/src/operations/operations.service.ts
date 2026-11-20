import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../platform/audit.service';
import { HttpSecurity } from '../platform/http';
import { CryptoService } from '../platform/crypto.service';
import { AppointmentQuery } from '../appointments/dto/appointment.dto';
@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly http: HttpSecurity, private readonly crypto: CryptoService) {}
  async health() { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok' }; }
  async metrics(actor: User) {
    const [pendingNotifications, failedNotifications, overdueReviews, unassignedReviews] = await Promise.all([
      this.prisma.notification.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      this.prisma.notification.count({ where: { status: 'FAILED' } }),
      this.prisma.booking.count({ where: { firstReviewedAt: null, responseDueAt: { lt: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.booking.count({ where: { assignedToId: null, firstReviewedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    ]);
    await this.audit.record(actor.id, 'METRICS_READ'); return { ...this.http.metrics, pendingNotifications, failedNotifications, overdueReviews, unassignedReviews, uptimeSeconds: Math.floor(process.uptime()) };
  }
  async auditEvents(actor: User, query: AppointmentQuery) {
    const [items, total] = await this.prisma.$transaction([this.prisma.auditEvent.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: query.limit, skip: (query.page - 1) * query.limit, select: { id: true, action: true, actorId: true, targetId: true, createdAt: true } }), this.prisma.auditEvent.count()]);
    await this.audit.record(actor.id, 'AUDIT_READ'); return { items, total, page: query.page, limit: query.limit };
  }
  private retention() {
    const days = Number(process.env.RETENTION_DAYS), policy = process.env.RETENTION_POLICY_REFERENCE;
    if (!Number.isInteger(days) || days < 1 || !policy || policy.length < 10) throw new BadRequestException('Política de retenção ainda não aprovada e configurada.');
    return { days, policy, cutoff: new Date(Date.now() - days * 86400_000) };
  }
  async preview(actor: User) {
    const { days, policy, cutoff } = this.retention();
    const count = await this.prisma.booking.count({ where: { status: { in: ['COMPLETED', 'CANCELLED'] }, updatedAt: { lt: cutoff }, sensitivePurgedAt: null } });
    await this.audit.record(actor.id, 'RETENTION_PREVIEW'); return { days, policy, cutoff, eligibleBookings: count };
  }
  async purge(actor: User, reference: string) {
    const { policy, cutoff } = this.retention();
    if (reference !== policy) throw new BadRequestException('Referência não corresponde à política configurada.');
    return this.prisma.$transaction(async tx => {
      const items = await tx.booking.findMany({ where: { status: { in: ['COMPLETED', 'CANCELLED'] }, updatedAt: { lt: cutoff }, sensitivePurgedAt: null }, take: 100 });
      for (const item of items) await tx.booking.update({ where: { id: item.id }, data: { reasonCipher: this.crypto.encrypt('', `reason:${item.id}`), noteCipher: this.crypto.encrypt('', `note:${item.id}`), sensitivePurgedAt: new Date() } });
      await tx.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      await tx.rateBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      await this.audit.record(actor.id, 'RETENTION_EXECUTED', undefined, { policy, ids: items.map(item => item.id) }, tx);
      return { purgedBookings: items.length, moreBatchesMayRemain: items.length === 100 };
    }, { timeout: 15000 });
  }
}
