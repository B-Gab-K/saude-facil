import { Injectable, OnModuleDestroy } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { ConfigService } from '../platform/config.service';

export abstract class NotificationTransport {
  abstract readonly enabled: boolean;
  abstract send(to: string, text: string, id: string): Promise<void>;
}
@Injectable()
export class SmtpNotificationTransport extends NotificationTransport implements OnModuleDestroy {
  readonly enabled: boolean;
  private readonly transport?: Transporter;
  constructor(private readonly config: ConfigService) {
    super();
    const mode = process.env.NOTIFICATION_MODE || 'disabled';
    if (!['disabled', 'capture', 'smtp'].includes(mode)) throw new Error('NOTIFICATION_MODE inválido.');
    this.enabled = mode !== 'disabled';
    if (!this.enabled) return;
    if (mode === 'capture' && !['development', 'test'].includes(config.environment)) throw new Error('Captura SMTP só é permitida em desenvolvimento e testes.');
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error('Configure SMTP_HOST e SMTP_FROM.');
    if (mode === 'smtp' && !process.env.SMTP_USER) throw new Error('SMTP real exige autenticação.');
    if (mode === 'smtp' && config.environment !== 'production' && !process.env.NOTIFICATION_ALLOWLIST) throw new Error('Homologação exige lista de destinatários autorizados.');
    this.transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', requireTLS: mode === 'smtp', ignoreTLS: mode === 'capture',
      auth: mode === 'smtp' ? { user: process.env.SMTP_USER, pass: config.secret('SMTP_PASSWORD') } : undefined,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, disableFileAccess: true, disableUrlAccess: true });
  }
  async send(to: string, text: string, id: string) {
    const allowlist = (process.env.NOTIFICATION_ALLOWLIST || '').split(',').map(item => item.trim().toLowerCase());
    if ((process.env.NOTIFICATION_MODE === 'smtp') && this.config.environment !== 'production' && !allowlist.includes(to.toLowerCase())) throw new Error('Destinatário não autorizado neste ambiente.');
    if (!this.transport) throw new Error('Notificações desativadas.');
    await this.transport.sendMail({ from: process.env.SMTP_FROM, to, subject: 'Saúde Fácil — atualização na sua conta', text,
      messageId: `<${id}@saude-facil.invalid>`, headers: { 'X-Auto-Response-Suppress': 'All' } });
  }
  onModuleDestroy() { this.transport?.close(); }
}
