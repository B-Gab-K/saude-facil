import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from './config.service';
@Injectable()
export class ExpirationService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  onModuleInit() {
    this.timer = setInterval(() => { this.cleanup().catch(() => process.stderr.write('{"event":"session_cleanup_failed"}\n')); }, 15 * 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async cleanup() {
    await this.prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { lastSeen: { lt: new Date(Date.now() - this.config.idleMinutes * 60_000) } }] } });
    await this.prisma.rateBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
