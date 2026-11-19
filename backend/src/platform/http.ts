import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { ConfigService } from './config.service';

interface Request {
  method: string;
  path: string;
  ip: string;
  requestId?: string;
  route?: { path?: string };
}
interface Response {
  statusCode: number;
  setHeader(name: string, value: string): void;
  status(code: number): Response;
  json(value: unknown): void;
  on(event: string, callback: () => void): void;
}

@Injectable()
export class HttpSecurity {
  readonly metrics = { requests: 0, errors: 0, rateLimited: 0 };
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly config: ConfigService) {}
  async handle(req: Request, res: Response, next: () => void) {
    const requestId = randomUUID(), start = Date.now(); req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
    const developmentConnections = this.config.production ? '' : ' http://localhost:3001 http://127.0.0.1:3001';
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'${developmentConnections} https://nominatim.openstreetmap.org; frame-src https://www.openstreetmap.org; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'`);
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.on('finish', () => {
      this.metrics.requests++; if (res.statusCode >= 500) this.metrics.errors++;
      // No URL parameters, payloads, cookies, identifiers or health data in logs.
      if (req.path.startsWith('/api')) process.stdout.write(JSON.stringify({ event: 'http', requestId, method: req.method, route: req.route?.path || 'unmatched', status: res.statusCode, durationMs: Date.now() - start }) + '\n');
    });
    if (!req.path.startsWith('/api') || req.method === 'OPTIONS') { next(); return; }
    try {
      const auth = ['/api/auth/login', '/api/auth/register'].includes(req.path);
      const interval = auth ? 15 * 60_000 : 60_000, limit = auth ? 15 : 300;
      const bucket = Math.floor(Date.now() / interval), id = this.crypto.lookup(`${req.ip}:${auth ? 'auth' : 'api'}:${bucket}`, 'rate');
      const expires = new Date((bucket + 1) * interval);
      const rows = await this.prisma.$queryRaw<{ count: number }[]>`INSERT INTO "RateBucket" (id, count, "expiresAt") VALUES (${id}, 1, ${expires}) ON CONFLICT (id) DO UPDATE SET count = "RateBucket".count + 1 RETURNING count`;
      if (rows[0].count > limit) {
        this.metrics.rateLimited++; res.setHeader('Retry-After', String(Math.max(1, Math.ceil((expires.getTime() - Date.now()) / 1000))));
        res.status(429).json({ statusCode: 429, message: 'Muitas tentativas. Aguarde antes de continuar.', requestId }); return;
      }
      next();
    } catch {
      res.status(503).json({ statusCode: 503, message: 'Serviço temporariamente indisponível.', requestId });
    }
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp(), req = ctx.getRequest<Request>(), response = ctx.getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const payload = error instanceof HttpException ? error.getResponse() : null;
    const message = status >= 500 ? 'Serviço temporariamente indisponível.' : typeof payload === 'object' && payload && 'message' in payload ? payload.message : 'Não foi possível concluir esta operação.';
    if (status >= 500) process.stderr.write(JSON.stringify({ event: 'request_error', requestId: req.requestId, type: error instanceof Error ? error.name : 'UnknownError' }) + '\n');
    response.status(status).json({ statusCode: status, message, requestId: req.requestId });
  }
}
