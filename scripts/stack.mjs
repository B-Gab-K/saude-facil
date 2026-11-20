import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function settings(environment) {
  if (!['development', 'staging', 'production'].includes(environment)) throw new Error('Ambiente inválido.');
  const file = resolve(root, 'deploy/config', environment + '.env'), values = {};
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (!match) throw new Error('Configuração inválida.'); values[match[1]] = match[2];
  }
  if (values.APP_ENV !== environment) throw new Error('Configuração não corresponde ao ambiente.');
  return { file, values };
}
export async function compose(environment, args, capture = false) {
  const { file, values } = await settings(environment);
  const flags = ['compose', '--project-name', 'saude-facil-' + environment, '--env-file', file, '-f', resolve(root, 'deploy/compose.yaml')];
  if (environment !== 'development') flags.push('-f', resolve(root, 'deploy/compose.secure.yaml'));
  if (args.includes('--capture')) {
    if (environment !== 'development') throw new Error('Captura local só pode ser usada em desenvolvimento.');
    args = args.filter(arg => arg !== '--capture'); flags.push('-f', resolve(root, 'deploy/compose.capture.yaml'));
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.DOCKER_BIN || 'docker', [...flags, ...args], { cwd: root, env: { ...process.env, ...values, ...(process.env.APP_IMAGE ? { APP_IMAGE: process.env.APP_IMAGE } : {}) }, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let output = ''; if (capture) { child.stdout.on('data', chunk => { output += chunk; }); child.stderr.resume(); }
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve(output.trim()) : reject(new Error('Docker Compose não concluiu a operação.')));
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [environment, ...args] = process.argv.slice(2);
  compose(environment, args).catch(error => { console.error(error.message); process.exitCode = 1; });
}
