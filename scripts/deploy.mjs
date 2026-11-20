import { compose } from './stack.mjs';
import { backupStack } from './backup-stack.mjs';
const [environment, image] = process.argv.slice(2);
if (!['staging', 'production'].includes(environment) || !/^[a-z0-9./:_-]+@sha256:[a-f0-9]{64}$/.test(image || '')) throw new Error('Use staging|production e uma imagem identificada por digest sha256 imutável.');
process.env.APP_IMAGE = image;
try {
  await compose(environment, ['pull', 'app', 'migrate']);
  await compose(environment, ['up', '-d', '--wait', 'db']);
  await backupStack(environment);
  await compose(environment, ['run', '--rm', 'migrate']);
  await compose(environment, ['up', '-d', '--no-deps', '--wait', '--wait-timeout', '120', 'app']);
  console.log('Release aplicada e saudável. O backup anterior foi preservado.');
} catch (error) { console.error(error.message + ' Não foi executada reversão automática de banco. Consulte o procedimento de recuperação.'); process.exitCode = 1; }
