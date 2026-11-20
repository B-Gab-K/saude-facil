import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url); require('reflect-metadata');
const { ConfigService } = require('../dist/platform/config.service');
const { CryptoService } = require('../dist/platform/crypto.service');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const container = process.env.BACKUP_TEST_CONTAINER, user = process.env.BACKUP_TEST_USER || 'saude';
if (!container || !/^[a-zA-Z0-9_-]+$/.test(container)) throw new Error('Configure BACKUP_TEST_CONTAINER para um container PostgreSQL descartável.');
const sql = (database, text) => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const run = (args, env) => new Promise((resolvePromise, reject) => {
  const child = spawn(process.execPath, [resolve(root, 'scripts/db-backup.mjs'), ...args, '--container', container], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', c => { output += c; }); child.stderr.on('data', c => { output += c; }); child.once('error', reject); child.once('close', code => resolvePromise({ code, output }));
});
test('backup PostgreSQL cifrado restaura dados e rejeita adulteração, chave incorreta e destino ocupado', async () => {
  const suffix = randomUUID().replaceAll('-', ''), source = 'backup_source_' + suffix, target = 'backup_restore_' + suffix, scratch = 'backup_empty_' + suffix;
  const directory = await mkdtemp(join(tmpdir(), 'saude-backup-test-')), backup = join(directory, 'backup.sfb');
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('hex'); process.env.LOOKUP_HMAC_KEY = randomBytes(32).toString('hex');
  const crypto = new CryptoService(new ConfigService()), id = randomUUID(), profile = { nome: 'Pessoa Recuperação Teste', email: 'restore@example.test' }, cipher = crypto.encrypt(profile, 'user:' + id);
  const key = randomBytes(32).toString('hex'), connection = name => `postgresql://${user}@localhost/${name}`, env = { DATABASE_URL: connection(source), BACKUP_ENCRYPTION_KEY: key };
  try {
    for (const name of [source, target, scratch]) sql('postgres', `CREATE DATABASE "${name}";`);
    const migrations = (await readdir(join(root, 'backend/prisma/migrations'), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    for (const migration of migrations) sql(source, await readFile(join(root, 'backend/prisma/migrations', migration, 'migration.sql'), 'utf8'));
    const password = await crypto.hashPassword('Senha-recuperacao-12345');
    sql(source, `INSERT INTO "User" (id,"emailHash","profileCipher","passwordHash","searchTokens") VALUES ('${id}','restore-test','${cipher}','${password}','{}');`);
    assert.equal((await run(['backup', '--output', backup], env)).code, 0);
    assert.ok(!(await readFile(backup)).includes(Buffer.from('Pessoa Recuperação')));
    assert.equal((await run(['restore', '--input', backup, '--confirm-database', target], { ...env, DATABASE_URL: connection(target) })).code, 0);
    const recovered = sql(target, `SELECT "profileCipher" FROM "User" WHERE id='${id}';`); assert.deepEqual(crypto.decrypt(recovered, 'user:' + id), profile);
    assert.notEqual((await run(['restore', '--input', backup, '--confirm-database', target], { ...env, DATABASE_URL: connection(target) })).code, 0);
    const tampered = join(directory, 'tampered.sfb'), data = await readFile(backup); data[Math.floor(data.length / 2)] ^= 1; await writeFile(tampered, data);
    assert.notEqual((await run(['restore', '--input', tampered, '--confirm-database', scratch], { ...env, DATABASE_URL: connection(scratch) })).code, 0);
    assert.notEqual((await run(['restore', '--input', backup, '--confirm-database', scratch], { ...env, DATABASE_URL: connection(scratch), BACKUP_ENCRYPTION_KEY: randomBytes(32).toString('hex') })).code, 0);
    assert.equal(sql(scratch, "SELECT count(*) FROM pg_tables WHERE schemaname='public';"), '0');
  } finally {
    for (const name of [source, target, scratch]) sql('postgres', `DROP DATABASE IF EXISTS "${name}" WITH (FORCE);`);
    await rm(directory, { recursive: true, force: true });
  }
});
