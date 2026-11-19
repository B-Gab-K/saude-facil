import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from './config.service';
import { CryptoService } from './crypto.service';
import { AuditService } from './audit.service';
import { HttpSecurity } from './http';
import { LegacyArchiveService } from './legacy-archive.service';
import { ExpirationService } from './expiration.service';

@Global()
@Module({ providers: [PrismaService, ConfigService, CryptoService, AuditService, HttpSecurity, LegacyArchiveService, ExpirationService], exports: [PrismaService, ConfigService, CryptoService, AuditService, HttpSecurity] })
export class PlatformModule {}
