require('reflect-metadata');
const { PrismaClient } = require('../../generated/prisma');
const { ConfigService } = require('../../dist/platform/config.service');
const { CryptoService } = require('../../dist/platform/crypto.service');
const { execFileSync, spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const url = new URL(process.env.TEST_DATABASE_URL || '');
if (!url.pathname.endsWith('_test')) throw new Error('Use somente um banco exclusivo com nome terminado em _test.');
const schema = 'browser_' + randomUUID().replaceAll('-', ''); url.searchParams.set('schema', schema);
Object.assign(process.env, { DATABASE_URL: url.toString(), APP_ENV: 'test', NODE_ENV: 'test', DEMO_MODE: 'true', DATA_ENCRYPTION_KEY: randomBytes(32).toString('hex'), LOOKUP_HMAC_KEY: randomBytes(32).toString('hex'), PORT: '3101', FRONTEND_ORIGINS: 'http://127.0.0.1:3101', NOTIFICATION_MODE: 'disabled' });
const prisma = new PrismaClient(), crypto = new CryptoService(new ConfigService());
let app, closing = false;
async function close() {
  if (closing) return; closing = true;
  if (app && app.exitCode === null) { app.kill('SIGTERM'); await once(app, 'exit'); }
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await prisma.$disconnect(); process.exit(0);
}
process.on('SIGTERM', close); process.on('SIGINT', close);
(async () => {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  const unit = await prisma.healthUnit.create({ data: { name: 'Unidade para testes', address: 'Rua de Teste 100, Cáceres MT', sourceUrl: 'https://www.caceres.mt.gov.br/', active: true, verifiedAt: new Date(), verifiedBy: 'fixture', responseMinutes: 60 } });
  const service = await prisma.careService.create({ data: { unitId: unit.id, name: 'Atendimento de teste', evidence: 'Somente para testes', active: true, verifiedAt: new Date(), verifiedBy: 'fixture' } });
  for (const [email, role, nome] of [['patient@example.test', 'PATIENT', 'Paciente Teste'], ['admin@example.test', 'ADMIN', 'Administrador Teste'], ['nurse@example.test', 'NURSE', 'Enfermagem Teste']]) {
    const id = randomUUID();
    await prisma.user.create({ data: { id, role, unitId: role === 'ADMIN' ? null : unit.id, emailHash: crypto.lookup(email, 'email'), identityHash: role === 'PATIENT' ? crypto.lookup('00000000191', 'cpf') : null, profileCipher: crypto.encrypt({ nome, email, ...(role === 'PATIENT' ? { cpf: '00000000191', nasc: '1990-01-01' } : {}) }, `user:${id}`), searchTokens: crypto.nameTokens(nome), passwordHash: await crypto.hashPassword('Browser-Test-Only123!'), verifiedAt: new Date() } });
    if (role === 'NURSE') await prisma.healthUnit.update({ where: { id: unit.id }, data: { responsibleUserId: id } });
  }
  for (let index = 1; index <= 3; index++) { const startsAt = new Date(Date.now() + index * 86400000); startsAt.setUTCHours(12, 0, 0, 0); await prisma.scheduleSlot.create({ data: { serviceId: service.id, resource: unit.id + ':test', startsAt, endsAt: new Date(startsAt.getTime() + 1800000), createdBy: 'fixture' } }); }
  app = spawn(process.execPath, ['dist/main.js'], { env: process.env, stdio: 'inherit' });
})().catch(async error => { console.error(error.name); await close(); });
