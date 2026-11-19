import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import { Role } from '../../generated/prisma';
import { ConfigService } from '../platform/config.service';
import { AuthService } from './auth.service';
import { AuthRequest } from './access';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService, private readonly config: ConfigService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (mutation && !this.config.origins.includes(String(request.headers.origin || ''))) throw new ForbiddenException('Origem não autorizada.');
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    Object.assign(request, await this.auth.authenticate(request.headers.cookie));
    if (mutation) {
      const supplied = Buffer.from(String(request.headers['x-csrf-token'] || '')), expected = Buffer.from(request.csrf);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new ForbiddenException('Atualize a página antes de continuar.');
    }
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [context.getHandler(), context.getClass()]);
    if (roles && !roles.includes(request.actor.role)) throw new ForbiddenException('Seu perfil não permite esta ação.');
    return true;
  }
}
