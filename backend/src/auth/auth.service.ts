import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Role, User } from '../../generated/prisma';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../platform/crypto.service';
import { ConfigService } from '../platform/config.service';
import { AuditService } from '../platform/audit.service';
import { serializable } from '../platform/transaction';
import { LoginDto, PasswordDto, RegisterDto, StaffDto } from './auth.dto';
import { CookieResponse, Profile } from './access';

@Injectable()
export class AuthService {
  private readonly dummyHash: Promise<string>;
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly config: ConfigService, private readonly audit: AuditService) {
    this.dummyHash = crypto.hashPassword(crypto.token());
  }
  emailHash(email: string) { return this.crypto.lookup(email.trim().toLowerCase(), 'email'); }
  profile(user: User) { return this.crypto.decrypt<Profile>(user.profileCipher, `user:${user.id}`); }
  view(user: User) { return { id: user.id, role: user.role, unitId: user.unitId, verified: !!user.verifiedAt, nome: this.profile(user).nome }; }

  async register(dto: RegisterDto) {
    if (!this.validCpf(dto.cpf) || dto.nasc > new Date().toISOString().slice(0, 10)) throw new BadRequestException('CPF ou nascimento inválido.');
    const unit = await this.prisma.healthUnit.findFirst({ where: { id: dto.unitId, active: true, verifiedAt: { not: null } } });
    if (!unit) throw new BadRequestException('Selecione uma unidade validada.');
    const id = randomUUID(), passwordHash = await this.crypto.hashPassword(dto.password);
    try {
      return await serializable(this.prisma, async tx => {
        const user = await tx.user.create({ data: { id, emailHash: this.emailHash(dto.email), identityHash: this.crypto.lookup(dto.cpf, 'cpf'), passwordHash, unitId: unit.id, searchTokens: this.crypto.nameTokens(dto.nome),
          profileCipher: this.crypto.encrypt({ nome: dto.nome.trim(), email: dto.email.trim().toLowerCase(), cpf: dto.cpf, nasc: dto.nasc }, `user:${id}`) } });
        await this.audit.record(id, 'ACCOUNT_REGISTERED', id, {}, tx);
        return this.view(user);
      });
    } catch (error) {
      if (error instanceof ConflictException) throw new ConflictException('Não foi possível cadastrar. Confira os dados ou entre em sua conta.');
      throw error;
    }
  }

  async login(dto: LoginDto, response: CookieResponse) {
    const user = await this.prisma.user.findUnique({ where: { emailHash: this.emailHash(dto.email) } });
    const valid = await this.crypto.verifyPassword(dto.password, user?.passwordHash || await this.dummyHash);
    if (!user || !valid || user.disabled || (user.lockedUntil && user.lockedUntil > new Date())) {
      if (user && !user.disabled) {
        await this.prisma.$transaction(async tx => {
          await tx.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
          await tx.user.updateMany({ where: { id: user.id, failedLogins: { gte: 5 } }, data: { lockedUntil: new Date(Date.now() + 15 * 60_000) } });
        });
      }
      await this.audit.record(user?.id || null, 'LOGIN_FAILED');
      throw new UnauthorizedException('Credenciais inválidas ou acesso temporariamente indisponível.');
    }
    const token = this.crypto.token(), sessionId = this.crypto.digest(token);
    await this.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
      await tx.session.create({ data: { id: sessionId, userId: user.id, expiresAt: new Date(Date.now() + this.config.sessionHours * 3600_000) } });
      await this.audit.record(user.id, 'LOGIN_SUCCESS', undefined, {}, tx);
    });
    this.cookie(response, token);
    return { user: this.view(user), csrf: this.crypto.lookup(token, 'csrf') };
  }

  async authenticate(cookie: string | undefined) {
    const token = cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${this.config.cookieName}=`))?.slice(this.config.cookieName.length + 1);
    if (!token || !/^[\w-]{43}$/.test(token)) throw new UnauthorizedException('Entre em sua conta.');
    const session = await this.prisma.session.findUnique({ where: { id: this.crypto.digest(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || session.lastSeen.getTime() < Date.now() - this.config.idleMinutes * 60_000 || session.user.disabled) throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    await this.prisma.session.updateMany({ where: { id: session.id }, data: { lastSeen: new Date() } });
    return { actor: session.user, sessionId: session.id, csrf: this.crypto.lookup(token, 'csrf') };
  }

  async logout(user: User, sessionId: string, response: CookieResponse) {
    await this.prisma.$transaction(async tx => {
      await tx.session.deleteMany({ where: { id: sessionId } });
      await this.audit.record(user.id, 'LOGOUT', undefined, {}, tx);
    });
    this.cookie(response, '', 0);
    return { ok: true };
  }

  async changePassword(user: User, dto: PasswordDto, response: CookieResponse) {
    if (!await this.crypto.verifyPassword(dto.currentPassword, user.passwordHash)) throw new ForbiddenException('Senha atual incorreta.');
    const passwordHash = await this.crypto.hashPassword(dto.newPassword);
    await this.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await this.audit.record(user.id, 'PASSWORD_CHANGED', undefined, {}, tx);
    });
    this.cookie(response, '', 0); return { ok: true };
  }

  async createStaff(actor: User, dto: StaffDto) {
    if (!await this.prisma.healthUnit.findUnique({ where: { id: dto.unitId } })) throw new BadRequestException('Unidade inválida.');
    const id = randomUUID(), passwordHash = await this.crypto.hashPassword(dto.password);
    return serializable(this.prisma, async tx => {
      const user = await tx.user.create({ data: { id, emailHash: this.emailHash(dto.email), passwordHash, role: dto.role, unitId: dto.unitId, verifiedAt: new Date(), searchTokens: this.crypto.nameTokens(dto.nome),
        profileCipher: this.crypto.encrypt({ nome: dto.nome.trim(), email: dto.email.trim().toLowerCase() }, `user:${id}`) } });
      await this.audit.record(actor.id, 'STAFF_CREATED', id, { role: dto.role, unitId: dto.unitId }, tx);
      return this.view(user);
    });
  }

  async pending(actor: User) {
    const users = await this.prisma.user.findMany({ where: { role: Role.PATIENT, verifiedAt: null, disabled: false, ...(actor.role === Role.ADMIN ? {} : { unitId: actor.unitId }) }, take: 50, orderBy: { createdAt: 'asc' } });
    await this.audit.record(actor.id, 'IDENTITIES_READ', undefined, { ids: users.map(u => u.id) });
    return users.map(user => ({ ...this.view(user), ...this.profile(user) }));
  }

  async verify(actor: User, id: string, evidence: string) {
    return serializable(this.prisma, async tx => {
      const user = await tx.user.findFirst({ where: { id, role: Role.PATIENT, ...(actor.role === Role.ADMIN ? {} : { unitId: actor.unitId }) } });
      if (!user || user.disabled) throw new BadRequestException('Conta não disponível nesta unidade.');
      const updated = await tx.user.update({ where: { id }, data: { verifiedAt: new Date() } });
      await this.audit.record(actor.id, 'IDENTITY_VERIFIED', id, { evidence }, tx);
      return this.view(updated);
    });
  }

  async disable(actor: User, id: string) {
    if (id === actor.id) throw new BadRequestException('Não desative sua própria conta.');
    return this.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id }, data: { disabled: true } });
      await tx.session.deleteMany({ where: { userId: id } });
      await this.audit.record(actor.id, 'ACCOUNT_DISABLED', id, {}, tx);
      return { ok: true };
    });
  }

  private cookie(response: CookieResponse, token: string, seconds = this.config.sessionHours * 3600) {
    response.setHeader('Set-Cookie', `${this.config.cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${this.config.httpsOptions ? '; Secure' : ''}`);
  }
  private validCpf(value: string) {
    if (/^(\d)\1{10}$/.test(value)) return false;
    return [9, 10].every(length => {
      const sum = value.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
      const check = (sum * 10) % 11;
      return Number(value[length]) === (check === 10 ? 0 : check);
    });
  }
}
