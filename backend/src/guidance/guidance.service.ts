import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../platform/audit.service';
import { ReviewDto } from './guidance.controller';
import { CryptoService } from '../platform/crypto.service';
import { randomUUID } from 'node:crypto';

export const GUIDANCE_VERSION = 'education-2026-11-18-v1';
export const guidanceContent = {
  version: GUIDANCE_VERSION, mode: 'EDUCATIONAL', automatedTriage: false,
  title: 'Orientação geral de saúde',
  message: 'Este conteúdo não avalia sintomas, não classifica risco e não substitui o acolhimento por profissional de saúde. O agendamento não atende emergências.',
  emergency: 'Em caso de dificuldade importante para respirar, dor forte e súbita no peito, alteração súbita da fala ou força, convulsão, perda de consciência ou outra emergência, ligue 192 (SAMU) ou procure atendimento de emergência. Não aguarde um horário agendado.',
  sources: [
    { title: 'Ministério da Saúde — SAMU 192', url: 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192' },
    { title: 'Ministério da Saúde — AVC', url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/avc' },
  ],
};
@Injectable()
export class GuidanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly crypto: CryptoService) {}
  async policy() {
    const review = await this.prisma.clinicalReview.findFirst({ where: { version: GUIDANCE_VERSION, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { approvedAt: 'desc' } });
    return { ...guidanceContent, review: review ? { id: review.id, approvedAt: review.approvedAt, expiresAt: review.expiresAt } : null, reviewStatus: review ? 'REVIEW_RECORDED' : 'PENDING_PROFESSIONAL_REVIEW' };
  }
  async approve(actor: User, dto: ReviewDto) {
    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= new Date() || expiresAt.getTime() > Date.now() + 366 * 86400_000) throw new BadRequestException('Informe validade futura de até um ano.');
    return this.prisma.$transaction(async tx => {
      const id = randomUUID();
      const review = await tx.clinicalReview.create({ data: { id, version: GUIDANCE_VERSION, reviewerId: actor.id, evidence: this.crypto.encrypt(dto.evidence, `review:${id}`), expiresAt } });
      await this.audit.record(actor.id, 'EDUCATIONAL_CONTENT_REVIEWED', review.id, { version: GUIDANCE_VERSION }, tx); return { id, version: review.version, approvedAt: review.approvedAt, expiresAt };
    });
  }
  async revoke(actor: User, id: string) {
    return this.prisma.$transaction(async tx => {
      const review = await tx.clinicalReview.findUnique({ where: { id } });
      if (!review) throw new NotFoundException('Revisão não encontrada.');
      await tx.clinicalReview.update({ where: { id }, data: { revokedAt: new Date() } });
      await this.audit.record(actor.id, 'EDUCATIONAL_REVIEW_REVOKED', id, {}, tx); return { ok: true };
    });
  }
}
