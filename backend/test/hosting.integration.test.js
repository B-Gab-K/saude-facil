require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { execFileSync, spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const { PrismaClient } = require('../generated/prisma');
const { ConfigService } = require('../dist/platform/config.service');
const { seedDemo } = require('../dist/cli/seed-demo');

test('inicialização hospedada, seed isolado, sessão segura e reserva pela API', async t => {
  const url = new URL(process.env.TEST_DATABASE_URL || '');
  if (!url.pathname.endsWith('_test')) throw new Error('Use banco exclusivo terminado em _test.');
  const schema = 'hosting_' + randomUUID().replaceAll('-', ''); url.searchParams.set('schema', schema);
  const previous = { ...process.env };
  Object.assign(process.env, { DATABASE_URL: url.toString(), APP_ENV: 'staging', NODE_ENV: 'production', TLS_TERMINATION: 'proxy', FRONTEND_ORIGINS: 'https://demo.example.test', DEMO_MODE: 'true', SEED_DEMO: 'true', NOTIFICATION_MODE: 'disabled', DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), LOOKUP_HMAC_KEY: randomBytes(32).toString('base64'), DEMO_ADMIN_PASSWORD: randomBytes(24).toString('base64url'), DEMO_PATIENT_PASSWORD: randomBytes(24).toString('base64url'), DEMO_STAFF_PASSWORD: randomBytes(24).toString('base64url') });
  const prisma = new PrismaClient(); let app, logs = '';
  t.after(async () => {
    if (app && app.exitCode === null) { app.kill('SIGTERM'); await once(app, 'exit'); }
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await prisma.$disconnect();
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  });
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  const config = new ConfigService();
  await t.test('seed concorrente é idempotente e não simula revisão clínica', async () => {
    const results = await Promise.all([seedDemo(prisma, config), seedDemo(prisma, config)]);
    assert.equal(results.filter(result => result.initialized).length, 1);
    assert.equal(await prisma.user.count(), 5); assert.equal(await prisma.scheduleSlot.count(), 21);
    assert.equal(await prisma.clinicalReview.count(), 0);
    assert.equal(await prisma.auditEvent.count({ where: { action: 'DEMO_INITIALIZED' } }), 1);
  });
  await t.test('chaves trocadas não geram outra instalação nem substituem dados', async () => {
    const original = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    try { await assert.rejects(seedDemo(prisma, new ConfigService())); }
    finally { process.env.DATA_ENCRYPTION_KEY = original; }
    assert.equal(await prisma.user.count(), 5);
  });
  await t.test('seed recusa banco ocupado sem marcador e não deixa gravações parciais', async () => {
    const otherSchema = 'occupied_' + randomUUID().replaceAll('-', ''), otherUrl = new URL(url); otherUrl.searchParams.set('schema', otherSchema);
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: otherUrl.toString() }, stdio: 'pipe' });
    const occupied = new PrismaClient({ datasources: { db: { url: otherUrl.toString() } } });
    try {
      await occupied.healthUnit.create({ data: { name: 'Existente', address: 'Teste', sourceUrl: 'https://example.test' } });
      await assert.rejects(seedDemo(occupied, config), /banco já ocupado/);
      assert.equal(await occupied.user.count(), 0); assert.equal(await occupied.healthUnit.count(), 1);
      const bootstrapEnv = { ...process.env, DATABASE_URL: otherUrl.toString(), ADMIN_EMAIL: 'bootstrap@example.test', ADMIN_NAME: 'Admin Teste', ADMIN_PASSWORD: randomBytes(24).toString('hex') };
      execFileSync(process.execPath, ['dist/cli/bootstrap-admin.js'], { env: bootstrapEnv, stdio: 'pipe' });
      assert.equal(await occupied.user.count({ where: { role: 'ADMIN' } }), 1);
      assert.throws(() => execFileSync(process.execPath, ['dist/cli/bootstrap-admin.js'], { env: bootstrapEnv, stdio: 'pipe' }));
      assert.equal(await occupied.user.count({ where: { role: 'ADMIN' } }), 1);
    } finally { await occupied.$executeRawUnsafe(`DROP SCHEMA "${otherSchema}" CASCADE`); await occupied.$disconnect(); }
  });
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  app = spawn('sh', ['../deploy/start-hosted.sh'], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  app.stdout.on('data', chunk => { logs += chunk; }); app.stderr.on('data', chunk => { logs += chunk; });
  const base = `http://127.0.0.1:${port}/api`;
  let ready = false;
  for (let i = 0; i < 150; i++) {
    if (app.exitCode !== null) break;
    try { if ((await fetch(base + '/operations/health')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Inicialização hospedada falhou.');
  await t.test('aviso público, login e reserva preservam autorização e cookies seguros', async () => {
    assert.deepEqual(await (await fetch(base + '/operations/public-config')).json(), { demo: true });
    const login = await fetch(base + '/auth/login', { method: 'POST', headers: { Origin: config.origins[0], 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'paciente@example.test', password: process.env.DEMO_PATIENT_PASSWORD }) });
    assert.equal(login.status, 201);
    const cookie = login.headers.get('set-cookie'); assert.match(cookie, /^__Host-sf_session=/); assert.match(cookie, /; Secure$/);
    const { csrf } = await login.json();
    const headers = { Origin: config.origins[0], Cookie: cookie.split(';')[0], 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' };
    const unit = (await (await fetch(base + '/catalog/units')).json())[0]; assert.match(unit.name, /Fictícia/);
    const slots = await (await fetch(base + '/catalog/slots?serviceId=' + unit.services[0].id, { headers })).json();
    const booked = await fetch(base + '/solicitacoes', { method: 'POST', headers, body: JSON.stringify({ slotId: slots.items[0].id, reason: '' }) });
    assert.equal(booked.status, 201); assert.equal((await booked.json()).status, 'CONFIRMED');
    assert.equal((await fetch(base + '/catalog/management', { headers })).status, 403);
    assert.equal((await fetch(base + '/solicitacoes', { method: 'POST', headers: { ...headers, Origin: 'https://evil.example.test' }, body: JSON.stringify({ slotId: slots.items[1].id, reason: '' }) })).status, 403);
    assert.equal(await prisma.user.count(), 5); assert.equal(await prisma.scheduleSlot.count(), 21);
    assert.equal(logs.includes(process.env.DEMO_PATIENT_PASSWORD), false);
    assert.equal(logs.includes(process.env.DATA_ENCRYPTION_KEY), false);
  });
});
