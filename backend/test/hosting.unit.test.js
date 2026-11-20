require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { ConfigService } = require('../dist/platform/config.service');
const { AuthService } = require('../dist/auth/auth.service');
const { validateDemoTarget } = require('../dist/cli/seed-demo');

function environment(t, overrides = {}) {
  const keys = ['NODE_ENV', 'APP_ENV', 'FRONTEND_ORIGINS', 'RENDER', 'RENDER_EXTERNAL_URL', 'TLS_TERMINATION', 'TLS_CERT_PATH', 'TLS_KEY_PATH', 'DATA_ENCRYPTION_KEY', 'DATA_ENCRYPTION_KEY_FILE', 'LOOKUP_HMAC_KEY', 'LOOKUP_HMAC_KEY_FILE', 'DEMO_MODE', 'DATABASE_URL', 'NOTIFICATION_MODE', 'DEMO_ADMIN_PASSWORD', 'DEMO_PATIENT_PASSWORD', 'DEMO_STAFF_PASSWORD', 'DEMO_PASSWORD_RESET_ID'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { NODE_ENV: 'production', APP_ENV: 'staging', TLS_TERMINATION: 'proxy', FRONTEND_ORIGINS: 'https://demo.example.test', DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), LOOKUP_HMAC_KEY: randomBytes(32).toString('hex'), ...overrides });
  t.after(() => { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } });
}

test('proxy HTTPS mantém cookies Secure, HttpOnly e __Host no login e no logout', async t => {
  environment(t);
  const config = new ConfigService();
  assert.equal(config.httpsOptions, undefined);
  const user = { id: 'patient', role: 'PATIENT', passwordHash: 'hash', failedLogins: 0, disabled: false };
  const tx = { user: { update: async () => {} }, session: { create: async () => {}, deleteMany: async () => {} } };
  const prisma = { user: { findUnique: async () => user }, $transaction: callback => callback(tx) };
  const crypto = { hashPassword: async () => 'hash', token: () => 'a'.repeat(43), digest: () => 'digest', lookup: () => 'csrf', verifyPassword: async () => true, decrypt: () => ({ nome: 'Teste' }) };
  const auth = new AuthService(prisma, crypto, config, { record: async () => {} });
  let cookie;
  const response = { setHeader: (name, value) => { assert.equal(name, 'Set-Cookie'); cookie = value; } };
  await auth.login({ email: 'patient@example.test', password: 'test' }, response);
  assert.match(cookie, /^__Host-sf_session=/);
  assert.match(cookie, /; Secure$/); assert.match(cookie, /HttpOnly; SameSite=Strict; Path=\//);
  await auth.logout(user, 'session', response);
  assert.match(cookie, /Max-Age=0; Secure$/);
});

test('produção só aceita TLS no proxy quando explicitamente configurado e com origem HTTPS', t => {
  environment(t);
  process.env.TLS_TERMINATION = 'direct'; assert.throws(() => new ConfigService(), /HTTPS obrigatório/);
  process.env.TLS_TERMINATION = 'invalid'; assert.throws(() => new ConfigService(), /TLS_TERMINATION/);
  process.env.TLS_TERMINATION = 'proxy'; process.env.FRONTEND_ORIGINS = 'http://demo.example.test';
  assert.throws(() => new ConfigService(), /FRONTEND_ORIGINS/);
  process.env.FRONTEND_ORIGINS = 'https://demo.example.test'; process.env.TLS_CERT_PATH = '/missing';
  assert.throws(() => new ConfigService(), /juntos/);
});

test('Render deriva a origem de sua configuração e aceita chaves aleatórias base64 de 256 bits', t => {
  environment(t, { RENDER: 'true', RENDER_EXTERNAL_URL: 'https://saude-demo.onrender.com' });
  delete process.env.FRONTEND_ORIGINS;
  assert.deepEqual(new ConfigService().origins, ['https://saude-demo.onrender.com']);
  process.env.DATA_ENCRYPTION_KEY = 'invalid'; assert.throws(() => new ConfigService(), /DATA_ENCRYPTION_KEY/);
  process.env.DATA_ENCRYPTION_KEY = Buffer.from(process.env.LOOKUP_HMAC_KEY, 'hex').toString('base64');
  assert.throws(() => new ConfigService(), /independentes/);
});

test('seed fictício recusa produção, banco comum, senha ausente e notificações reais', t => {
  environment(t, { DEMO_MODE: 'true', DATABASE_URL: 'postgresql://test:test@localhost/saude_facil_demo', DEMO_ADMIN_PASSWORD: 'admin-random-test-only', DEMO_PATIENT_PASSWORD: 'patient-random-test-only', DEMO_STAFF_PASSWORD: 'staff-random-test-only' });
  validateDemoTarget(new ConfigService());
  process.env.DEMO_PASSWORD_RESET_ID = 'invalid reset'; assert.throws(() => validateDemoTarget(new ConfigService()), /DEMO_PASSWORD_RESET_ID/);
  delete process.env.DEMO_PASSWORD_RESET_ID;
  process.env.APP_ENV = 'production'; assert.throws(() => new ConfigService(), /Demonstração exige/);
  process.env.APP_ENV = 'staging'; process.env.DATABASE_URL = 'postgresql://test:test@localhost/saude_facil';
  assert.throws(() => validateDemoTarget(new ConfigService()), /banco exclusivo/);
  process.env.DATABASE_URL += '_demo'; delete process.env.DEMO_ADMIN_PASSWORD;
  assert.throws(() => validateDemoTarget(new ConfigService()), /DEMO_ADMIN_PASSWORD/);
  process.env.NOTIFICATION_MODE = 'smtp'; assert.throws(() => new ConfigService(), /notificações desativadas/);
});
