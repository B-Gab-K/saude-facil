import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, mkdir, mkdtemp, open, stat, link, unlink, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const magic = Buffer.from('SFBK1\n');
const args = process.argv.slice(2), operation = args.shift();
const option = name => { const index = args.indexOf('--' + name); return index < 0 ? undefined : args[index + 1]; };
const secret = async name => process.env[name + '_FILE'] ? (await readFile(process.env[name + '_FILE'], 'utf8')).trim() : process.env[name] || '';
let url;
try { url = new URL(await secret('DATABASE_URL')); } catch { throw new Error('DATABASE_URL inválida.'); }
if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.username || url.pathname === '/') throw new Error('Configure uma conexão PostgreSQL com usuário e banco explícitos.');
const database = decodeURIComponent(url.pathname.slice(1)), user = decodeURIComponent(url.username);
const keyText = await secret('BACKUP_ENCRYPTION_KEY');
if (!/^[a-f\d]{64}$/i.test(keyText)) throw new Error('Configure BACKUP_ENCRYPTION_KEY ou BACKUP_ENCRYPTION_KEY_FILE (32 bytes hex).');
const key = Buffer.from(keyText, 'hex'), container = option('container');
if (container && !/^[a-zA-Z0-9_-]+$/.test(container)) throw new Error('Container inválido.');
const env = { ...process.env, PGDATABASE: database, PGUSER: user, PGPASSWORD: decodeURIComponent(url.password), PGHOST: url.hostname, PGPORT: url.port || '5432', PGCONNECT_TIMEOUT: '10' };
function command(program, values) {
  return container ? spawn('docker', ['exec', '-i', container, program, '--username', user, '--dbname', database, ...values], { stdio: ['pipe', 'pipe', 'pipe'] }) : spawn(program, values, { env, stdio: ['pipe', 'pipe', 'pipe'] });
}
function completion(child) {
  let failure = '';
  child.stderr.on('data', () => { failure = 'Falha do cliente PostgreSQL.'; });
  return new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => code === 0 ? resolve() : reject(new Error(failure || 'Cliente PostgreSQL indisponível.'))); });
}
async function backup() {
  const output = resolve(option('output') || ''), partial = output + '.partial-' + randomBytes(8).toString('hex');
  if (!option('output')) throw new Error('Informe --output arquivo.sfb.');
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  try { await stat(output); throw new Error('O arquivo de saída já existe.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const iv = randomBytes(12), header = Buffer.concat([magic, iv]);
  const cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(header);
  const child = command('pg_dump', ['--format=custom', '--no-owner', '--no-acl']), done = completion(child);
  const file = await open(partial, 'wx', 0o600);
  try {
    await file.write(header); await file.close();
    await Promise.all([pipeline(child.stdout, cipher, createWriteStream(partial, { flags: 'a', mode: 0o600 })), done]);
    const tail = await open(partial, 'a'); await tail.write(cipher.getAuthTag()); await tail.sync(); await tail.close();
    const hash = createHash('sha256'); await pipeline(createReadStream(partial), hash); const sha256 = hash.digest('hex');
    await link(partial, output); await unlink(partial);
    const manifest = await open(output + '.manifest.json', 'wx', 0o600);
    await manifest.writeFile(JSON.stringify({ format: 'SFBK1/AES-256-GCM', createdAt: new Date().toISOString(), keyId: process.env.BACKUP_KEY_ID || 'institution-managed', sha256 }, null, 2) + '\n'); await manifest.close();
    console.log('Backup cifrado e manifesto criados.');
  } catch (error) { child.kill('SIGTERM'); await unlink(partial).catch(() => {}); throw error; }
}
async function restore() {
  if (option('confirm-database') !== database || !option('input')) throw new Error('Informe --input e --confirm-database com o nome exato do banco de destino vazio.');
  const source = resolve(option('input')), size = (await stat(source)).size;
  if (size < magic.length + 12 + 16) throw new Error('Backup inválido.');
  const handle = await open(source, 'r'), header = Buffer.alloc(magic.length + 12), tag = Buffer.alloc(16);
  await handle.read(header, 0, header.length, 0); await handle.read(tag, 0, tag.length, size - 16); await handle.close();
  if (!header.subarray(0, magic.length).equals(magic)) throw new Error('Formato desconhecido.');
  const directory = await mkdtemp(join(tmpdir(), 'saude-restore-')), plaintext = join(directory, 'database.dump');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(magic.length)); decipher.setAAD(header); decipher.setAuthTag(tag);
    // Authenticate the COMPLETE dump before opening a restore connection.
    await pipeline(createReadStream(source, { start: header.length, end: size - 17 }), decipher, createWriteStream(plaintext, { flags: 'wx', mode: 0o600 }));
    const check = command('psql', ['--no-psqlrc', '--tuples-only', '--no-align', '--command', "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')"]), checked = completion(check);
    let count = ''; check.stdout.on('data', chunk => { count += chunk; }); check.stdin.end(); await checked;
    if (count.trim() !== '0') throw new Error('Restauração recusada: o banco de destino contém tabelas. Use um banco vazio e isolado.');
    const child = command('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl']), done = completion(child);
    child.stdout.resume(); await Promise.all([pipeline(createReadStream(plaintext), child.stdin), done]); console.log('Restauração autenticada concluída no banco vazio informado.');
  } finally { await rm(directory, { recursive: true, force: true }); }
}
try {
  if (operation === 'backup') await backup(); else if (operation === 'restore') await restore(); else throw new Error('Use backup --output ou restore --input --confirm-database.');
} catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Falha no backup.') + '\n'); process.exitCode = 1; }
