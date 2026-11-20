import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';

@Injectable()
export class ConfigService {
  readonly environment = process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  readonly production = process.env.NODE_ENV === 'production';
  readonly encryptionKey = this.key('DATA_ENCRYPTION_KEY');
  readonly lookupKey = this.key('LOOKUP_HMAC_KEY');
  readonly origins = (process.env.FRONTEND_ORIGINS || (process.env.RENDER === 'true' ? process.env.RENDER_EXTERNAL_URL : '') || 'http://localhost:3001,http://127.0.0.1:3001,http://localhost:8000,http://127.0.0.1:8000').split(',');
  readonly cookieName = this.production ? '__Host-sf_session' : 'sf_session';
  readonly sessionHours = 8;
  readonly idleMinutes = 30;
  readonly tlsTermination = process.env.TLS_TERMINATION || 'direct';
  readonly httpsOptions = this.tls();
  readonly secureCookies = this.production || !!this.httpsOptions;
  readonly demoMode = process.env.DEMO_MODE === 'true';

  constructor() {
    if (!['development', 'staging', 'production', 'test'].includes(this.environment)) throw new Error('APP_ENV inválido.');
    if (['staging', 'production'].includes(this.environment) && !this.production) throw new Error('Homologação e produção exigem NODE_ENV=production e TLS.');
    if (process.env.DEMO_MODE && !['true', 'false'].includes(process.env.DEMO_MODE)) throw new Error('DEMO_MODE inválido.');
    if (this.demoMode && !['staging', 'test'].includes(this.environment)) throw new Error('Demonstração exige ambiente staging ou test separado.');
    if (this.demoMode && process.env.NOTIFICATION_MODE && process.env.NOTIFICATION_MODE !== 'disabled') throw new Error('Demonstração exige notificações desativadas.');
    if (this.encryptionKey.equals(this.lookupKey)) throw new Error('Use chaves independentes para criptografia e busca.');
    for (const origin of this.origins) {
      const url = new URL(origin);
      if (url.origin !== origin || (this.production && url.protocol !== 'https:')) throw new Error('FRONTEND_ORIGINS inválido.');
    }
  }

  private key(name: string): Buffer {
    const value = this.secret(name);
    if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, 'hex');
    if (/^[A-Za-z0-9+/]{43}=$/.test(value)) {
      const decoded = Buffer.from(value, 'base64');
      if (decoded.length === 32 && decoded.toString('base64') === value) return decoded;
    }
    throw new Error(`${name} deve conter 32 bytes aleatórios em hexadecimal ou base64 canônico.`);
  }
  secret(name: string): string {
    const filename = process.env[`${name}_FILE`];
    return filename ? readFileSync(filename, 'utf8').trim() : process.env[name] || '';
  }

  private tls() {
    const cert = process.env.TLS_CERT_PATH, key = process.env.TLS_KEY_PATH;
    if (!['direct', 'proxy'].includes(this.tlsTermination)) throw new Error('TLS_TERMINATION deve ser direct ou proxy.');
    if (!!cert !== !!key) throw new Error('Configure certificado e chave TLS juntos.');
    if (this.tlsTermination === 'proxy') {
      if (!this.production) throw new Error('TLS no proxy exige NODE_ENV=production.');
      if (cert || key) throw new Error('TLS no proxy não usa arquivos TLS na aplicação.');
      return undefined;
    }
    if (cert && key) return { cert: readFileSync(cert), key: readFileSync(key) };
    if (this.production) throw new Error('HTTPS obrigatório: configure TLS_CERT_PATH e TLS_KEY_PATH.');
    return undefined;
  }
}
