import { compose, root, settings } from './stack.mjs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export async function backupStack(environment, directory) {
  const { values } = await settings(environment), container = await compose(environment, ['ps', '-q', 'db'], true);
  if (!container || !/^[a-f0-9]+$/.test(container)) throw new Error('Banco deste ambiente não está em execução.');
  const secrets = resolve(root, 'deploy', values.SECRETS_DIR), output = resolve(directory || resolve(root, 'backups', environment), new Date().toISOString().replaceAll(':', '-') + '.sfb');
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(root, 'scripts/db-backup.mjs'), 'backup', '--container', container, '--output', output], { env: { ...process.env, DATABASE_URL_FILE: resolve(secrets, 'database_url'), BACKUP_ENCRYPTION_KEY_FILE: resolve(secrets, 'backup_key'), BACKUP_KEY_ID: environment + '-v1' }, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolvePromise() : reject(new Error('Backup não concluído. Implantação interrompida.')));
  });
  return output;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) backupStack(...process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
