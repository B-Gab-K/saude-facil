const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const net = require('node:net');
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('Defina TEST_DATABASE_URL apontando para um banco de testes migrado.');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

test('API e PostgreSQL preservam as regras de solicitações', async (t) => {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}/api/solicitacoes`;
  const id = `test-${randomUUID()}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const app = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(port) },
    stdio: 'ignore',
  });
  t.after(async () => {
    app.kill('SIGTERM');
    await prisma.appointment.deleteMany({ where: { id } });
    await prisma.$disconnect();
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(url)).ok) { ready = true; break; } } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'A API não iniciou ou o banco não está disponível.');

  const send = (method, path = '', body) => fetch(url + path, {
    method, headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = {
    id, codigo: 'TESTE', ubs: 'UBS fictícia', servico: 'Enfermagem', data: '2099-02-28',
    paciente: { nome: 'Pessoa Exemplo', cpf: '000.000.000-00', nasc: '1990-01-01', sus: '' },
    triagemResumo: 'Queixa fictícia',
  };
  assert.equal((await send('POST', '', { ...payload, data: '2099-02-30' })).status, 400);
  assert.equal((await send('POST', '', { ...payload, paciente: [] })).status, 400);
  assert.equal((await send('POST', '', { ...payload, paciente: { ...payload.paciente, cpf: '123' } })).status, 400);
  const created = await send('POST', '', payload);
  assert.equal(created.status, 201);
  assert.equal((await created.json()).status, 'SOLICITAÇÃO RECEBIDA');
  assert.equal((await send('POST', '', payload)).status, 409);
  assert.equal((await send('PATCH', `/${id}`, { status: 'inválido' })).status, 400);
  assert.equal((await send('PATCH', `/${id}`, { data: null })).status, 400);
  assert.equal((await send('PATCH', `/${id}`, { observacao: 'Revisado' })).status, 200);
  assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id } })).observacao, 'Revisado');
  await assert.rejects(prisma.appointment.update({ where: { id }, data: { status: 'inválido' } }));

  const competing = await Promise.all([
    send('PATCH', `/${id}`, { status: 'CANCELADO' }),
    send('PATCH', `/${id}`, { status: 'ATENDIMENTO FINALIZADO' }),
  ]);
  assert.deepEqual(competing.map(response => response.status).sort(), [200, 409]);
  assert.equal((await send('PATCH', `/${id}`, { observacao: 'Outra alteração' })).status, 409);
  assert.equal((await send('DELETE', `/${id}`)).status, 200);
  assert.equal((await send('DELETE', `/${id}`)).status, 404);
});
