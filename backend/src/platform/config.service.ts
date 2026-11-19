import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';

@Injectable()
export class ConfigService {
  readonly production = process.env.NODE_ENV === 'production';
  readonly encryptionKey = this.key('DATA_ENCRYPTION_KEY');
  readonly lookupKey = this.key('LOOKUP_HMAC_KEY');
  readonly origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3001,http://127.0.0.1:3001,http://localhost:8000,http://127.0.0.1:8000').split(',');
  readonly cookieName = this.production ? '__Host-sf_session' : 'sf_session';
  readonly sessionHours = 8;
  readonly idleMinutes = 30;
  readonly httpsOptions = this.tls();

  constructor() {
    if (this.encryptionKey.equals(this.lookupKey)) throw new Error('Use chaves independentes para criptografia e busca.');
    for (const origin of this.origins) {
      const url = new URL(origin);
      if (url.origin !== origin || (this.production && url.protocol !== 'https:')) throw new Error('FRONTEND_ORIGINS inválido.');
    }
  }

  private key(name: string): Buffer {
    const value = process.env[name] || '';
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${name} deve conter 32 bytes aleatórios em hexadecimal.`);
    return Buffer.from(value, 'hex');
  }

  private tls() {
    const cert = process.env.TLS_CERT_PATH, key = process.env.TLS_KEY_PATH;
    if (cert && key) return { cert: readFileSync(cert), key: readFileSync(key) };
    if (this.production) throw new Error('HTTPS obrigatório: configure TLS_CERT_PATH e TLS_KEY_PATH.');
    return undefined;
  }
}
