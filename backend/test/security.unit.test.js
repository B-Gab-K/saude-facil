require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { ConfigService } = require('../dist/platform/config.service');
const { CryptoService } = require('../dist/platform/crypto.service');
const { AppointmentPolicy } = require('../dist/appointments/appointment-status');
const { guidanceContent } = require('../dist/guidance/guidance.service');

process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('hex');
process.env.LOOKUP_HMAC_KEY = randomBytes(32).toString('hex');
test('criptografia autentica conteúdo e contexto e não reutiliza IV', () => {
  const crypto = new CryptoService(new ConfigService());
  const a = crypto.encrypt({ nome: 'Teste' }, 'profile:a'), b = crypto.encrypt({ nome: 'Teste' }, 'profile:a');
  assert.notEqual(a, b); assert.deepEqual(crypto.decrypt(a, 'profile:a'), { nome: 'Teste' });
  assert.throws(() => crypto.decrypt(a, 'profile:b'));
  const parts = a.split('.'); parts[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => crypto.decrypt(parts.join('.'), 'profile:a'));
  assert.notEqual(crypto.lookup('value', 'email'), crypto.lookup('value', 'cpf'));
});
test('senha usa salt individual e valida em tempo constante', async () => {
  const crypto = new CryptoService(new ConfigService()), password = 'uma-senha-longa-para-teste';
  const a = await crypto.hashPassword(password), b = await crypto.hashPassword(password);
  assert.notEqual(a, b); assert.equal(await crypto.verifyPassword(password, a), true); assert.equal(await crypto.verifyPassword('senha-incorreta', a), false);
});
test('política impede saltos de status, alterações encerradas e conclusão antecipada', () => {
  const policy = new AppointmentPolicy(), future = new Date(Date.now() + 86400_000), past = new Date(Date.now() - 86400_000);
  const patient = { role: 'PATIENT', id: 'a' }, nurse = { role: 'NURSE', unitId: 'u' }, reception = { role: 'RECEPTION', unitId: 'u' };
  assert.throws(() => policy.transition(nurse, 'CONFIRMED', 'COMPLETED', past));
  assert.throws(() => policy.transition(nurse, 'IN_REVIEW', 'COMPLETED', future));
  assert.throws(() => policy.transition(reception, 'IN_REVIEW', 'COMPLETED', past));
  assert.throws(() => policy.transition(patient, 'CONFIRMED', 'IN_REVIEW', future));
  assert.throws(() => policy.reschedule(patient, 'COMPLETED', future));
  policy.transition(patient, 'CONFIRMED', 'CANCELLED', future); policy.transition(nurse, 'IN_REVIEW', 'COMPLETED', past);
  assert.deepEqual(policy.scope(patient), { patientId: 'a' }); assert.deepEqual(policy.scope(nurse), { slot: { service: { unitId: 'u' } } });
});
test('orientação permanece educativa, sem diagnóstico ou classificação de risco', () => {
  assert.equal(guidanceContent.mode, 'EDUCATIONAL'); assert.equal(guidanceContent.automatedTriage, false);
  assert.match(guidanceContent.emergency, /192/); assert.equal(guidanceContent.sources.every(source => source.url.startsWith('https://www.gov.br/saude/')), true);
});
test('produção rejeita HTTP e segredos ausentes ou reutilizados', () => {
  const previous = { encryption: process.env.DATA_ENCRYPTION_KEY, lookup: process.env.LOOKUP_HMAC_KEY, mode: process.env.NODE_ENV };
  try {
    delete process.env.DATA_ENCRYPTION_KEY; assert.throws(() => new ConfigService(), /DATA_ENCRYPTION_KEY/);
    process.env.DATA_ENCRYPTION_KEY = previous.encryption; process.env.LOOKUP_HMAC_KEY = previous.encryption;
    assert.throws(() => new ConfigService(), /independentes/);
    process.env.LOOKUP_HMAC_KEY = previous.lookup; process.env.NODE_ENV = 'production';
    assert.throws(() => new ConfigService(), /HTTPS obrigatório/);
  } finally {
    process.env.DATA_ENCRYPTION_KEY = previous.encryption; process.env.LOOKUP_HMAC_KEY = previous.lookup;
    if (previous.mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.mode;
  }
});
