import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [environment, origin, cert, key] = process.argv.slice(2);
if (!['development', 'staging', 'production'].includes(environment)) throw new Error('Informe development, staging ou production, seguido da origem pública.');
const publicOrigin = origin || 'http://localhost:3001';
if (new URL(publicOrigin).origin !== publicOrigin || (environment !== 'development' && !publicOrigin.startsWith('https://'))) throw new Error('Homologação e produção precisam de origem HTTPS exata.');
if (environment !== 'development' && (!cert || !key)) throw new Error('Informe os caminhos de certificado e chave TLS já provisionados.');
if (cert) { await access(cert); await access(key); }
const configuration = resolve(root, 'deploy/config', environment + '.env'), directory = resolve(root, 'deploy/secrets', environment);
try { await access(configuration); throw new Error('Configuração já existe. Não regeneraremos segredos de uma instalação existente.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(directory, { recursive: true, mode: 0o700 });
const password = randomBytes(32).toString('hex'), database = 'saude_facil_' + environment;
const secrets = { database_password: password, database_url: `postgresql://saude:${password}@db:5432/${database}?schema=public`, data_key: randomBytes(32).toString('hex'), lookup_key: randomBytes(32).toString('hex'), backup_key: randomBytes(32).toString('hex'), smtp_password: '' };
for (const [name, value] of Object.entries(secrets)) await writeFile(resolve(directory, name), value + '\n', { flag: 'wx', mode: 0o600 });
if (cert) { await writeFile(resolve(directory, 'tls_cert'), await readFile(cert), { flag: 'wx', mode: 0o600 }); await writeFile(resolve(directory, 'tls_key'), await readFile(key), { flag: 'wx', mode: 0o600 }); }
const template = await readFile(resolve(root, 'deploy/config', environment + '.env.example'), 'utf8');
const content = template.replace(/^FRONTEND_ORIGINS=.*$/m, 'FRONTEND_ORIGINS=' + publicOrigin).replace(/^APP_UID=.*$/m, 'APP_UID=' + process.getuid()).replace(/^APP_GID=.*$/m, 'APP_GID=' + process.getgid());
await writeFile(configuration, content, { flag: 'wx', mode: 0o600 });
console.log(`Configuração de ${environment} e chaves independentes criadas. Nenhum segredo foi impresso. Não regenere estas chaves em uma instalação com dados.`);
