require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const net = require('node:net');
const { PrismaClient } = require('../generated/prisma');
const { CryptoService } = require('../dist/platform/crypto.service');
const { ConfigService } = require('../dist/platform/config.service');
const { AuditService } = require('../dist/platform/audit.service');
const { OperationsService } = require('../dist/operations/operations.service');
const { NotificationsService } = require('../dist/notifications/notifications.service');
const { NotificationsWorker } = require('../dist/notifications/notifications.worker');
const { NotificationOutbox } = require('../dist/notifications/notification-outbox');
const { SmtpNotificationTransport } = require('../dist/notifications/notification.transport');
const { SMTPServer } = require('smtp-server');

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL deve apontar para um banco exclusivo cujo nome termine em _test.');
async function freePort() {
  const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
function cpf(base) {
  let result = base.padStart(9, '0');
  for (const size of [9, 10]) { const sum = [...result].reduce((total, digit, i) => total + Number(digit) * (size + 1 - i), 0); result += ((sum * 10) % 11) % 10; }
  return result;
}

test('segurança, catálogo e reserva transacional com PostgreSQL real', async t => {
  const schema = 'test_' + randomUUID().replaceAll('-', '');
  const url = new URL(databaseUrl); url.searchParams.set('schema', schema);
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('hex'); process.env.LOOKUP_HMAC_KEY = randomBytes(32).toString('hex');
  const config = new ConfigService(), crypto = new CryptoService(config);
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  let app;
  t.after(async () => {
    if (app && app.exitCode === null) { app.kill('SIGTERM'); await once(app, 'exit'); }
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await prisma.$disconnect();
  });
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'pipe' });
  const password = 'Teste-individual-12345', adminId = randomUUID();
  const staffFixture = async (id, nome, role, unitId) => prisma.user.create({ data: { id, emailHash: crypto.lookup(nome + '@example.test', 'email'), passwordHash: await crypto.hashPassword(password), role, unitId, verifiedAt: new Date(), searchTokens: crypto.nameTokens(nome), profileCipher: crypto.encrypt({ nome, email: nome + '@example.test' }, `user:${id}`) } });
  await staffFixture(adminId, 'admin', 'ADMIN');
  const legacyId = randomUUID();
  await prisma.appointment.create({ data: { id: legacyId, codigo: 'OLD', ubs: 'Antiga', servico: 'Antigo', data: '2026-01-01', hora: '', status: 'CANCELADO', paciente: { nome: 'Pessoa Arquivada', cpf: '00000000000' }, triagemResumo: 'Texto antigo', observacao: '' } });
  const port = await freePort(), origin = `http://127.0.0.1:${port}`, base = origin + '/api';
  app = spawn(process.execPath, ['dist/main.js'], { env: { ...process.env, DATABASE_URL: url.toString(), PORT: String(port), FRONTEND_ORIGINS: origin }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; app.stdout.on('data', chunk => { logs += chunk; }); app.stderr.on('data', chunk => { logs += chunk; });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (app.exitCode !== null) break;
    try { if ((await fetch(base + '/operations/health')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'API não iniciou: ' + logs);
  const client = () => {
    let cookie = '', csrf = '';
    return {
      async call(method, path, body, headers = {}) {
        return fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      },
      async login(email) {
        const response = await this.call('POST', '/auth/login', { email, password });
        assert.equal(response.status, 201, await response.clone().text());
        const setCookie = response.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/);
        cookie = setCookie.split(';')[0]; const body = await response.json(); csrf = body.csrf; return body.user;
      },
      async json(method, path, body, status = 201) {
        const response = await this.call(method, path, body); assert.equal(response.status, status, await response.clone().text()); return response.json();
      },
    };
  };
  const admin = client(); await admin.login('admin@example.test');
  let unit, otherUnit, service, otherService;
  await t.test('unidades e serviços só aparecem após confirmação; escopo da coordenação é obrigatório', async () => {
    unit = await admin.json('POST', '/catalog/units', { name: 'Unidade Teste', address: 'Rua de Teste, 100, Cáceres MT', sourceUrl: 'https://www.caceres.mt.gov.br/' });
    assert.equal((await admin.json('GET', '/catalog/units', undefined, 200)).length, 0);
    await admin.json('POST', `/catalog/units/${unit.id}/approve`, { evidence: 'Validação de teste institucional' });
    service = await admin.json('POST', '/catalog/services', { unitId: unit.id, name: 'Enfermagem Teste', evidence: 'Oferta confirmada em teste' });
    assert.equal((await admin.json('GET', '/catalog/units', undefined, 200))[0].services.length, 0);
    await admin.json('POST', `/catalog/services/${service.id}/approve`, { evidence: 'Oferta confirmada em teste' });
    otherUnit = await admin.json('POST', '/catalog/units', { name: 'Outra Unidade', address: 'Outra Rua de Teste, 200, Cáceres MT', sourceUrl: 'https://www.caceres.mt.gov.br/' });
    await admin.json('POST', `/catalog/units/${otherUnit.id}/approve`, { evidence: 'Outra validação de teste' });
    otherService = await admin.json('POST', '/catalog/services', { unitId: otherUnit.id, name: 'Outro Serviço', evidence: 'Outra oferta confirmada' });
    await admin.json('POST', `/catalog/services/${otherService.id}/approve`, { evidence: 'Outra oferta confirmada' });
  });
  const nurse = client(), reception = client(), otherNurse = client(), coordinator = client();
  for (const [nome, role, unitId, login] of [['nurse', 'NURSE', unit.id, nurse], ['reception', 'RECEPTION', unit.id, reception], ['othernurse', 'NURSE', otherUnit.id, otherNurse], ['coordinator', 'COORDINATOR', unit.id, coordinator]]) {
    await admin.json('POST', '/users/staff', { nome, email: nome + '@example.test', password, role, unitId }); await login.login(nome + '@example.test');
  }
  const a = client(), b = client(); let patientA, patientB;
  await t.test('cadastro não pode elevar privilégios; identidade precisa de conferência e dados ficam cifrados', async () => {
    const payload = { nome: 'Paciente Teste A', cpf: cpf('101'), nasc: '1990-01-01', email: 'a@example.test', password, unitId: unit.id };
    assert.equal((await a.call('POST', '/auth/register', { ...payload, role: 'ADMIN' })).status, 400);
    patientA = await a.json('POST', '/auth/register', payload);
    patientB = await b.json('POST', '/auth/register', { ...payload, nome: 'Paciente Teste B', cpf: cpf('102'), email: 'b@example.test' });
    await a.login('a@example.test'); await b.login('b@example.test');
    assert.equal((await a.call('POST', '/solicitacoes', { slotId: randomUUID(), reason: '' })).status, 403);
    await reception.json('POST', `/users/${patientA.id}/verify`, { evidence: 'Documento conferido presencialmente no teste' });
    assert.equal((await otherNurse.call('POST', `/users/${patientB.id}/verify`, { evidence: 'Tentativa fora da unidade' })).status, 403);
    await reception.json('POST', `/users/${patientB.id}/verify`, { evidence: 'Documento conferido presencialmente no teste' });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: patientA.id } });
    assert.ok(!stored.profileCipher.includes('Paciente')); assert.ok(!stored.profileCipher.includes(payload.cpf)); assert.ok(!stored.passwordHash.includes(password));
    const legacy = await prisma.appointment.findUniqueOrThrow({ where: { id: legacyId } });
    assert.ok(legacy.paciente.sealed); assert.ok(!JSON.stringify(legacy).includes('Pessoa Arquivada')); assert.ok(!legacy.triagemResumo.includes('Texto antigo'));
  });
  const slot = async (index, serviceId = service.id, resource = 'profissional-1') => {
    const start = new Date(Date.now() + (48 + index) * 3600_000); start.setUTCMinutes(0, 0, 0);
    return admin.json('POST', '/catalog/slots', { serviceId, resource, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 30 * 60_000).toISOString() });
  };
  let booking, owner, outsider;
  await t.test('reservas concorrentes não ocupam a mesma vaga; pacientes e outras unidades não veem dados alheios', async () => {
    const target = await slot(0);
    const responses = await Promise.all([a.call('POST', '/solicitacoes', { slotId: target.id, reason: 'Motivo sensível' }), b.call('POST', '/solicitacoes', { slotId: target.id, reason: 'Outro motivo' })]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    const winner = responses[0].status === 201 ? 0 : 1; owner = winner === 0 ? a : b; outsider = winner === 0 ? b : a; booking = await responses[winner].json();
    assert.equal((await outsider.call('GET', `/solicitacoes/${booking.id}`)).status, 404);
    assert.equal((await otherNurse.call('GET', `/solicitacoes/${booking.id}`)).status, 404);
    assert.equal((await otherNurse.json('GET', '/solicitacoes?unitId=' + unit.id, undefined, 200)).total, 0);
    assert.equal((await reception.json('GET', `/solicitacoes/${booking.id}`, undefined, 200)).triagemResumo, '');
    assert.ok((await nurse.json('GET', `/solicitacoes/${booking.id}`, undefined, 200)).triagemResumo);
    assert.equal((await outsider.call('GET', '/solicitacoes')).status, 200);
    assert.equal((await client().call('GET', '/solicitacoes')).status, 401);
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }); assert.ok(!stored.reasonCipher.includes('Motivo'));
  });
  await t.test('banco bloqueia sobreposição de recursos e API rejeita escopo, datas e transições inválidas', async () => {
    const target = await slot(1);
    const body = { serviceId: service.id, resource: 'profissional-1', startsAt: target.startsAt, endsAt: target.endsAt };
    assert.equal((await admin.call('POST', '/catalog/slots', body)).status, 409);
    await assert.rejects(prisma.scheduleSlot.create({ data: { ...body, createdBy: adminId, resource: unit.id + ':profissional-1' } }));
    assert.equal((await coordinator.call('POST', '/catalog/slots', { ...body, serviceId: otherService.id })).status, 404);
    assert.equal((await coordinator.call('POST', `/catalog/units/${otherUnit.id}/approve`, { evidence: 'Tentativa em outra unidade' })).status, 404);
    assert.equal((await owner.call('PATCH', `/solicitacoes/${booking.id}`, { status: 'COMPLETED', version: booking.version })).status, 409);
    assert.equal((await owner.call('PATCH', `/solicitacoes/${booking.id}`, { status: 'IN_REVIEW', version: booking.version })).status, 403);
    assert.equal((await owner.call('GET', '/solicitacoes?limit=1000')).status, 400);
    assert.equal((await admin.call('POST', '/catalog/slots', { ...body, startsAt: '2026-02-30T10:00:00Z' })).status, 400);
  });
  await t.test('reagendamento mantém a reserva anterior em falhas e usa versão para impedir perda de atualização', async () => {
    const next = await slot(2), occupied = await slot(3);
    const otherBooking = await outsider.json('POST', '/solicitacoes', { slotId: occupied.id });
    assert.equal((await owner.call('POST', `/solicitacoes/${booking.id}/reschedule`, { slotId: occupied.id, version: booking.version })).status, 409);
    assert.equal((await owner.json('GET', `/solicitacoes/${booking.id}`, undefined, 200)).slotId, booking.slotId);
    const moved = await owner.json('POST', `/solicitacoes/${booking.id}/reschedule`, { slotId: next.id, version: booking.version });
    assert.equal(moved.slotId, next.id); assert.equal(moved.version, 2);
    assert.equal((await owner.call('PATCH', `/solicitacoes/${booking.id}`, { status: 'CANCELLED', version: booking.version })).status, 409);
    booking = moved;
    const query = await admin.json('GET', '/solicitacoes?limit=1&sort=startsAt&order=asc', undefined, 200); assert.equal(query.items.length, 1); assert.equal(query.total, 2);
    assert.ok((await admin.json('GET', '/solicitacoes?q=Paciente', undefined, 200)).total >= 1);
    await outsider.json('PATCH', `/solicitacoes/${otherBooking.id}`, { status: 'CANCELLED', version: otherBooking.version }, 200);
  });
  await t.test('conflitos de estado, CSRF, revogação e auditoria não podem ser contornados', async () => {
    assert.equal((await owner.call('PATCH', `/solicitacoes/${booking.id}`, { status: 'CANCELLED', version: booking.version }, { 'X-CSRF-Token': '' })).status, 403);
    assert.equal((await owner.call('PATCH', `/solicitacoes/${booking.id}`, { status: 'CANCELLED', version: booking.version }, { Origin: 'https://invalid.example' })).status, 403);
    const competing = await Promise.all([owner.call('PATCH', `/solicitacoes/${booking.id}`, { status: 'CANCELLED', version: booking.version }), nurse.call('PATCH', `/solicitacoes/${booking.id}`, { status: 'IN_REVIEW', version: booking.version })]);
    assert.deepEqual(competing.map(r => r.status).sort(), [200, 409]);
    const current = await owner.json('GET', `/solicitacoes/${booking.id}`, undefined, 200);
    if (current.status !== 'CANCELLED') await owner.json('PATCH', `/solicitacoes/${booking.id}`, { status: 'CANCELLED', version: current.version }, 200);
    const event = await prisma.auditEvent.findFirst({ where: { action: 'BOOKING_CREATED' } }); assert.ok(event);
    await assert.rejects(prisma.auditEvent.delete({ where: { id: event.id } }));
    assert.equal((await nurse.call('GET', '/operations/audit')).status, 403);
    await admin.json('GET', '/operations/audit', undefined, 200);
    await admin.json('PATCH', `/users/${patientB.id}/disable`, {}, 200); assert.equal((await b.call('GET', '/solicitacoes')).status, 401);
    await nurse.json('POST', '/auth/logout', {}); assert.equal((await nurse.call('GET', '/auth/me')).status, 401);
  });
  await t.test('orientação não oferece diagnóstico automático e só enfermagem registra revisão', async () => {
    const policy = await admin.json('GET', '/guidance', undefined, 200); assert.equal(policy.automatedTriage, false); assert.equal(policy.reviewStatus, 'PENDING_PROFESSIONAL_REVIEW');
    assert.equal((await reception.call('POST', '/guidance/reviews', { evidence: 'Teste sem habilitação', expiresAt: new Date(Date.now() + 86400_000).toISOString() })).status, 403);
    await otherNurse.json('POST', '/guidance/reviews', { evidence: 'Referência da revisão profissional de teste, sem uso real', expiresAt: new Date(Date.now() + 86400_000).toISOString() });
    assert.equal((await admin.json('GET', '/guidance', undefined, 200)).reviewStatus, 'REVIEW_RECORDED');
  });
  await t.test('paciente não consegue reservar intervalos simultâneos em recursos distintos; cancelamento libera vaga', async () => {
    const first = await slot(10, service.id, 'recurso-a'), second = await slot(10, service.id, 'recurso-b');
    assert.equal((await a.call('POST', '/solicitacoes', { slotId: first.id, reason: null })).status, 400);
    const attempts = await Promise.all([a.call('POST', '/solicitacoes', { slotId: first.id }), a.call('POST', '/solicitacoes', { slotId: second.id })]);
    assert.deepEqual(attempts.map(r => r.status).sort(), [201, 409]);
    const reserved = await attempts.find(response => response.status === 201).json();
    assert.equal((await admin.call('POST', `/catalog/slots/${reserved.slotId}/close`, {})).status, 409);
    await a.json('PATCH', `/solicitacoes/${reserved.id}`, { status: 'CANCELLED', version: reserved.version }, 200);
    const again = await a.json('POST', '/solicitacoes', { slotId: reserved.slotId });
    await a.json('PATCH', `/solicitacoes/${again.id}`, { status: 'CANCELLED', version: again.version }, 200);
    await admin.json('POST', `/catalog/slots/${reserved.slotId}/close`, {});
    assert.equal((await a.call('POST', '/solicitacoes', { slotId: reserved.slotId })).status, 409);
  });
  await t.test('finalização exige estado assistencial, perfil e horário iniciado; encerramento impede novas alterações', async () => {
    const id = randomUUID(), pastStart = new Date(Date.now() - 86400_000);
    const pastSlot = await prisma.scheduleSlot.create({ data: { serviceId: service.id, resource: unit.id + ':past', startsAt: pastStart, endsAt: new Date(pastStart.getTime() + 1800000), createdBy: adminId } });
    await prisma.booking.create({ data: { id, patientId: patientA.id, slotId: pastSlot.id, status: 'IN_REVIEW', reasonCipher: crypto.encrypt('Passado', `reason:${id}`), noteCipher: crypto.encrypt('', `note:${id}`) } });
    assert.equal((await reception.call('PATCH', `/solicitacoes/${id}`, { status: 'COMPLETED', version: 1 })).status, 403);
    const completed = await admin.json('PATCH', `/solicitacoes/${id}`, { status: 'COMPLETED', version: 1 }, 200);
    assert.equal(completed.status, 'COMPLETED');
    assert.equal((await admin.call('PATCH', `/solicitacoes/${id}`, { status: 'CANCELLED', version: 2 })).status, 409);
  });
  await t.test('retenção só remove textos elegíveis dentro da política aprovada e mantém trilha de auditoria', async () => {
    const ops = new OperationsService(prisma, new AuditService(prisma, crypto), { metrics: {} }, crypto), actor = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    delete process.env.RETENTION_DAYS; delete process.env.RETENTION_POLICY_REFERENCE;
    await assert.rejects(ops.preview(actor), /Política de retenção/);
    process.env.RETENTION_DAYS = '30'; process.env.RETENTION_POLICY_REFERENCE = 'POLITICA-APROVADA-PARA-TESTES';
    try {
      const archived = await prisma.booking.findFirstOrThrow({ where: { status: 'COMPLETED' } });
      await prisma.booking.update({ where: { id: archived.id }, data: { updatedAt: new Date(Date.now() - 40 * 86400_000) } });
      assert.equal((await ops.preview(actor)).eligibleBookings, 1);
      await assert.rejects(ops.purge(actor, 'REFERENCIA-INCORRETA'));
      assert.equal((await ops.purge(actor, process.env.RETENTION_POLICY_REFERENCE)).purgedBookings, 1);
      const purged = await prisma.booking.findUniqueOrThrow({ where: { id: archived.id } }); assert.ok(purged.sensitivePurgedAt); assert.equal(crypto.decrypt(purged.reasonCipher, `reason:${archived.id}`), '');
      assert.ok(await prisma.auditEvent.findFirst({ where: { action: 'RETENTION_EXECUTED' } }));
    } finally { delete process.env.RETENTION_DAYS; delete process.env.RETENTION_POLICY_REFERENCE; }
  });
  await t.test('alteração de senha revoga sessões; sessão inativa é rejeitada', async () => {
    const hash = (await prisma.user.findUniqueOrThrow({ where: { id: patientA.id } })).passwordHash;
    const session = await prisma.session.findFirstOrThrow({ where: { userId: patientA.id } });
    await prisma.session.update({ where: { id: session.id }, data: { lastSeen: new Date(Date.now() - 31 * 60_000) } });
    assert.equal((await a.call('GET', '/auth/me')).status, 401);
    await prisma.session.update({ where: { id: session.id }, data: { lastSeen: new Date() } });
    await a.json('POST', '/auth/password', { currentPassword: password, newPassword: 'Outra-senha-teste-12345' });
    assert.equal((await a.call('GET', '/auth/me')).status, 401);
    assert.equal(await prisma.session.count({ where: { userId: patientA.id } }), 0);
    assert.notEqual((await prisma.user.findUniqueOrThrow({ where: { id: patientA.id } })).passwordHash, hash);
  });
  await t.test('cadastro progressivo, identificação e responsabilidade com prazo administrativo', async () => {
    const newcomer = client(), created = await newcomer.json('POST', '/auth/register', { nome: 'Pessoa Cadastro Progressivo', email: 'new@example.test', password });
    assert.equal(created.identityComplete, false); assert.equal(created.unitId, null); await newcomer.login('new@example.test');
    assert.equal((await newcomer.call('POST', `/users/${created.id}/verify`, { evidence: 'Tentativa sem perfil' })).status, 403);
    const identified = await newcomer.json('POST', '/auth/identity', { cpf: cpf('103'), nasc: '1990-01-01', unitId: unit.id }); assert.equal(identified.identityComplete, true);
    await reception.json('POST', `/users/${created.id}/verify`, { evidence: 'Conferência de teste após cadastro' });
    const directory = await admin.json('GET', '/catalog/staff', undefined, 200), person = directory.find(person => person.role === 'RECEPTION');
    await admin.json('POST', `/catalog/units/${unit.id}/operations`, { responsibleUserId: person.id, responseMinutes: 60 });
    const target = await slot(20), item = await newcomer.json('POST', '/solicitacoes', { slotId: target.id });
    assert.ok(item.responseDueAt); assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: item.id } })).assignedToId, person.id);
    assert.equal((await newcomer.call('POST', `/solicitacoes/${item.id}/assignment`, { assigneeId: person.id, version: item.version })).status, 403);
    const reviewed = await reception.json('POST', `/solicitacoes/${item.id}/assignment`, { assigneeId: person.id, version: item.version }); assert.ok(reviewed.firstReviewedAt);
    assert.equal((await newcomer.call('POST', '/notifications/consent', { enabled: true })).status, 503);
  });
  await t.test('SMTP local, consentimento, verificação, outbox transacional e revogação', async () => {
    const messages = [], smtp = new SMTPServer({ authOptional: true, disabledCommands: ['AUTH', 'STARTTLS'], onData(stream, session, callback) { let message = ''; stream.on('data', chunk => { message += chunk; }); stream.on('end', () => { messages.push(message); callback(); }); } });
    await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve)); const smtpPort = smtp.server.address().port;
    const previous = Object.fromEntries(['NOTIFICATION_MODE', 'SMTP_HOST', 'SMTP_FROM', 'SMTP_PORT'].map(key => [key, process.env[key]]));
    Object.assign(process.env, { NOTIFICATION_MODE: 'capture', SMTP_HOST: '127.0.0.1', SMTP_FROM: 'local@example.test', SMTP_PORT: String(smtpPort) });
    const transport = new SmtpNotificationTransport(new ConfigService()), audit = new AuditService(prisma, crypto), notifications = new NotificationsService(prisma, crypto, audit, transport), worker = new NotificationsWorker(prisma, crypto, audit, transport), outbox = new NotificationOutbox(crypto);
    try {
      const id = randomUUID(); let user = await prisma.user.create({ data: { id, emailHash: crypto.lookup('mail@example.test', 'email'), profileCipher: crypto.encrypt({ nome: 'Teste Local', email: 'mail@example.test' }, `user:${id}`), passwordHash: await crypto.hashPassword(password), searchTokens: [] } });
      await prisma.$transaction(tx => outbox.booking(tx, id, 'never-sent', 1)); assert.equal(await prisma.notification.count({ where: { userId: id } }), 0);
      await notifications.consent(user, true);
      await assert.rejects(notifications.consent(user, true));
      await notifications.consent(user, false); await assert.rejects(notifications.consent(user, true));
      await prisma.user.update({ where: { id }, data: { lastEmailVerificationAt: new Date(Date.now() - 61000) } });
      await notifications.consent(user, true);
      const pending = await prisma.notification.findFirstOrThrow({ where: { userId: id, status: 'PENDING' } }), code = crypto.decrypt(pending.payloadCipher, 'notification').token;
      await worker.tick(); assert.equal(messages.length, 1);
      const body = messages[0].split(/\r?\n\r?\n/).slice(1).join('\n');
      const decoded = /Content-Transfer-Encoding: base64/i.test(messages[0]) ? Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8') : body.replace(/=\r?\n/g, '').replace(/=([A-F\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      assert.ok(decoded.includes(code));
      await notifications.verify(user, code); await assert.rejects(notifications.verify(user, code));
      user = await prisma.user.findUniqueOrThrow({ where: { id } });
      await prisma.$transaction(async tx => { await outbox.booking(tx, id, 'test-booking', 1); await outbox.booking(tx, id, 'test-booking', 1); });
      assert.equal(await prisma.notification.count({ where: { userId: id, kind: 'BOOKING_UPDATED' } }), 1);
      await worker.tick(); assert.equal(messages.length, 2); assert.ok(!messages[1].includes('Motivo sensível')); assert.ok(!messages[1].includes('Teste Local'));
      await prisma.$transaction(tx => outbox.booking(tx, id, 'test-booking', 2)); await notifications.consent(user, false); await worker.tick(); assert.equal(messages.length, 2);
      assert.equal(await prisma.notification.count({ where: { userId: id, status: 'CANCELLED' } }), 2);
      await notifications.consent(user, true);
      await assert.rejects(prisma.$transaction(async tx => { await outbox.booking(tx, id, 'rollback', 1); throw new Error('rollback'); }));
      assert.equal(await prisma.notification.count({ where: { dedupeKey: 'rollback:1:email' } }), 0);
      await prisma.$transaction(tx => outbox.booking(tx, id, 'retry', 1));
      const failedWorker = new NotificationsWorker(prisma, crypto, audit, { enabled: true, send: async () => { throw new Error('SMTP indisponível'); } });
      await failedWorker.tick(); const retry = await prisma.notification.findUniqueOrThrow({ where: { dedupeKey: 'retry:1:email' } });
      assert.equal(retry.attempts, 1); assert.equal(retry.status, 'PENDING'); assert.ok(retry.availableAt > new Date());
      await prisma.notification.update({ where: { id: retry.id }, data: { attempts: 4, availableAt: new Date(Date.now() - 1000) } }); await failedWorker.tick();
      assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: retry.id } })).status, 'FAILED');
      await prisma.$transaction(tx => outbox.booking(tx, id, 'concurrent', 1));
      let deliveries = 0; const capture = { enabled: true, send: async () => { deliveries++; await new Promise(resolve => setTimeout(resolve, 100)); } };
      await Promise.all([new NotificationsWorker(prisma, crypto, audit, capture).tick(), new NotificationsWorker(prisma, crypto, audit, capture).tick()]); assert.equal(deliveries, 1);
    } finally {
      transport.onModuleDestroy(); await new Promise(resolve => smtp.close(resolve));
      for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });
  await t.test('logs não contêm dados pessoais; retenção requer política; rate limit funciona', async () => {
    assert.ok(!logs.includes('Paciente Teste')); assert.ok(!logs.includes(password)); assert.ok(!logs.includes('Motivo sensível'));
    assert.equal((await admin.call('GET', '/operations/retention')).status, 400);
    const response = await admin.call('GET', '/operations/metrics'); assert.equal(response.status, 200); assert.ok(response.headers.get('content-security-policy')); assert.equal(response.headers.get('x-powered-by'), null);
    let limited = false;
    for (let i = 0; i < 16; i++) { const result = await client().call('POST', '/auth/login', { email: 'unknown@example.test', password }); if (result.status === 429) { limited = true; assert.ok(result.headers.get('retry-after')); break; } }
    assert.equal(limited, true);
  });
});
