import { SetMetadata } from '@nestjs/common';
import { Role, User } from '../../generated/prisma';
import { IncomingHttpHeaders } from 'node:http';

export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export interface AuthRequest {
  headers: IncomingHttpHeaders;
  method: string;
  actor: User;
  sessionId: string;
  csrf: string;
}
export interface Profile { nome: string; email: string; cpf?: string; nasc?: string }
export interface CookieResponse { setHeader(name: string, value: string): void }
