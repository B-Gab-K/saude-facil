import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ConfigService } from './config.service';

@Injectable()
export class CryptoService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: unknown, context: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.config.encryptionKey, iv);
    cipher.setAAD(Buffer.from(context));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  decrypt<T>(value: string, context: string): T {
    const [version, iv, tag, data] = value.split('.');
    if (version !== 'v1') throw new Error('Versão de criptografia desconhecida.');
    const decipher = createDecipheriv('aes-256-gcm', this.config.encryptionKey, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')) as T;
  }

  lookup(value: string, purpose: string): string {
    return createHmac('sha256', this.config.lookupKey).update(`${purpose}:${value}`).digest('hex');
  }

  token() { return randomBytes(32).toString('base64url'); }
  nameTokens(name: string) {
    return [...new Set(name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).flatMap(word => Array.from({ length: Math.max(0, Math.min(word.length, 30) - 2) }, (_, i) => this.lookup(word.slice(0, i + 3), 'name'))))];
  }
  digest(token: string) { return createHash('sha256').update(token).digest('hex'); }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = await this.derive(password, salt);
    return `scrypt-v1:${salt}:${hash.toString('hex')}`;
  }

  async verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [version, salt, hash] = encoded.split(':');
    if (version !== 'scrypt-v1' || !salt || !hash) return false;
    const calculated = await this.derive(password, salt), expected = Buffer.from(hash, 'hex');
    return calculated.length === expected.length && timingSafeEqual(calculated, expected);
  }

  private derive(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
  }
}
