import { access, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [origin] = process.argv.slice(2);
const url = new URL(origin || '');
if (url.origin !== origin || url.protocol !== 'https:') throw new Error('Informe a origem pública HTTPS exata.');
const config = resolve(root, 'deploy/config/demo.env'), secrets = resolve(root, 'deploy/secrets/demo');
try { await access(config); throw new Error('Demonstração já configurada; preserve as chaves e altere somente a origem quando necessário.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(secrets, { recursive: true, mode: 0o700 });
await mkdir(dirname(config), { recursive: true });
const password = randomBytes(32).toString('hex');
const values = { database_password: password, database_url: `postgresql://saude:${password}@db:5432/saude_facil_demo?schema=public`, data_key: randomBytes(32).toString('hex'), lookup_key: randomBytes(32).toString('hex'), demo_admin_password: randomBytes(24).toString('base64url'), demo_patient_password: randomBytes(24).toString('base64url'), demo_staff_password: randomBytes(24).toString('base64url') };
for (const [name, value] of Object.entries(values)) await writeFile(resolve(secrets, name), value + '\n', { flag: 'wx', mode: 0o600 });
const accounts = `Contas exclusivas da demonstração acadêmica. Não publicar este arquivo.\n\nAdministração: admin@example.test\nSenha: ${values.demo_admin_password}\n\nPaciente: paciente@example.test\nSenha: ${values.demo_patient_password}\n\nRecepção: recepcao@example.test\nEnfermagem: enfermagem@example.test\nCoordenação: coordenacao@example.test\nSenha da equipe fictícia: ${values.demo_staff_password}\n`;
await writeFile(resolve(secrets, 'ACESSOS.txt'), accounts, { flag: 'wx', mode: 0o600 });
await writeFile(config, `APP_ENV=staging\nNODE_ENV=production\nTLS_TERMINATION=proxy\nDEMO_MODE=true\nSEED_DEMO=true\nNOTIFICATION_MODE=disabled\nAPP_IMAGE=saude-facil:demo\nAPP_UID=${process.getuid()}\nAPP_GID=${process.getgid()}\nCONFIG_FILE=./config/demo.env\nSECRETS_DIR=./secrets/demo\nPOSTGRES_DB=saude_facil_demo\nBIND_ADDRESS=127.0.0.1\nAPP_PORT=3102\nPORT=3001\nFRONTEND_ORIGINS=${origin}\n`, { flag: 'wx', mode: 0o600 });
process.stdout.write('Demonstração isolada preparada. Credenciais em deploy/secrets/demo/ACESSOS.txt; nenhum segredo foi impresso.\n');
