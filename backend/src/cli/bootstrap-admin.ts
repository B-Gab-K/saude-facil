import 'reflect-metadata';
import { PrismaClient } from '../../generated/prisma';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '../platform/config.service';
import { CryptoService } from '../platform/crypto.service';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(), password = process.env.ADMIN_PASSWORD, nome = process.env.ADMIN_NAME;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !nome || !password || password.length < 12 || password.length > 128) throw new Error('Configure ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD (12 a 128 caracteres).');
  const prisma = new PrismaClient(), crypto = new CryptoService(new ConfigService());
  try {
    await prisma.$transaction(async tx => {
      // First administrator only. Additional administrative access requires a reviewed procedure.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(58291001)`;
      if (await tx.user.count({ where: { role: 'ADMIN' } })) throw new Error('Já existe um administrador. O bootstrap não altera contas existentes.');
      const id = randomUUID();
      await tx.user.create({ data: { id, emailHash: crypto.lookup(email, 'email'), profileCipher: crypto.encrypt({ nome, email }, `user:${id}`), searchTokens: crypto.nameTokens(nome), passwordHash: await crypto.hashPassword(password), role: 'ADMIN', verifiedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: id, action: 'ADMIN_BOOTSTRAPPED', targetId: id, detailCipher: crypto.encrypt({}, 'audit') } });
    });
    process.stdout.write('Administrador criado. Guarde as credenciais fora do repositório.\n');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { process.stderr.write((error instanceof Error ? error.message : 'Falha no bootstrap.') + '\n'); process.exitCode = 1; });
