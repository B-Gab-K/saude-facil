import 'reflect-metadata';
import { PrismaClient, Role } from '../../generated/prisma';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '../platform/config.service';
import { CryptoService } from '../platform/crypto.service';

const marker = 'academic-demo-v1';
const unitId = 'd0000000-0000-4000-8000-000000000001';
const serviceId = 'd0000000-0000-4000-8000-000000000002';
export const demoAccounts = [
  { role: Role.ADMIN, email: 'admin@example.test', nome: 'Administração Demonstração', passwordKey: 'DEMO_ADMIN_PASSWORD' },
  { role: Role.PATIENT, email: 'paciente@example.test', nome: 'Paciente Demonstração', passwordKey: 'DEMO_PATIENT_PASSWORD' },
  { role: Role.RECEPTION, email: 'recepcao@example.test', nome: 'Recepção Demonstração', passwordKey: 'DEMO_STAFF_PASSWORD' },
  { role: Role.NURSE, email: 'enfermagem@example.test', nome: 'Enfermagem Demonstração', passwordKey: 'DEMO_STAFF_PASSWORD' },
  { role: Role.COORDINATOR, email: 'coordenacao@example.test', nome: 'Coordenação Demonstração', passwordKey: 'DEMO_STAFF_PASSWORD' },
];

export function validateDemoTarget(config: ConfigService) {
  if (!config.demoMode || !['staging', 'test'].includes(config.environment)) throw new Error('Seed de demonstração exige DEMO_MODE=true em staging ou test.');
  const database = new URL(process.env.DATABASE_URL || '').pathname;
  if (!/_demo$|_test$/.test(database)) throw new Error('Seed de demonstração exige banco exclusivo terminado em _demo ou _test.');
  const resetId = process.env.DEMO_PASSWORD_RESET_ID;
  if (resetId && !/^[a-zA-Z0-9_-]{8,80}$/.test(resetId)) throw new Error('DEMO_PASSWORD_RESET_ID deve identificar uma operação com 8 a 80 caracteres alfanuméricos, hífen ou sublinhado.');
  for (const account of demoAccounts) {
    const password = config.secret(account.passwordKey);
    if (!password || password.length < 12 || password.length > 128) throw new Error(`Configure ${account.passwordKey} com 12 a 128 caracteres, sem senha padrão.`);
  }
}

export async function seedDemo(prisma: PrismaClient, config: ConfigService, now = new Date()) {
  validateDemoTarget(config);
  const crypto = new CryptoService(config);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(58291002)`;
    const initialized = await tx.auditEvent.findFirst({ where: { action: 'DEMO_INITIALIZED', targetId: marker } });
    const resetId = process.env.DEMO_PASSWORD_RESET_ID;
    if (resetId && !initialized) throw new Error('Redefinição exige uma demonstração já inicializada.');
    if (!initialized) {
      if (await tx.user.count() || await tx.healthUnit.count() || await tx.appointment.count()) throw new Error('O seed não modifica um banco já ocupado por outra instalação.');
      await tx.healthUnit.create({ data: { id: unitId, name: 'Unidade Fictícia — Demonstração', address: 'Endereço fictício, Cáceres MT', sourceUrl: 'https://example.invalid/demonstracao', active: true, verifiedAt: now, verifiedBy: marker, responseMinutes: 60 } });
      await tx.careService.create({ data: { id: serviceId, unitId, name: 'Atendimento fictício', evidence: 'Dado sintético para avaliação acadêmica; sem validação institucional.', active: true, verifiedAt: now, verifiedBy: marker } });
      for (const account of demoAccounts) {
        const id = randomUUID(), patient = account.role === Role.PATIENT;
        await tx.user.create({ data: { id, role: account.role, unitId: account.role === Role.ADMIN ? null : unitId,
          emailHash: crypto.lookup(account.email, 'email'), identityHash: patient ? crypto.lookup('00000000191', 'cpf') : null,
          profileCipher: crypto.encrypt({ nome: account.nome, email: account.email, ...(patient ? { cpf: '00000000191', nasc: '1990-01-01' } : {}) }, `user:${id}`),
          searchTokens: crypto.nameTokens(account.nome), passwordHash: await crypto.hashPassword(config.secret(account.passwordKey)), verifiedAt: now } });
        if (account.role === Role.NURSE) await tx.healthUnit.update({ where: { id: unitId }, data: { responsibleUserId: id } });
      }
      await tx.auditEvent.create({ data: { action: 'DEMO_INITIALIZED', targetId: marker, detailCipher: crypto.encrypt({ synthetic: true, simulatedIdentityVerification: true, institutionalApproval: false }, 'audit') } });
    } else {
      // Refuse to continue with replacement keys that cannot read the existing data.
      crypto.decrypt(initialized.detailCipher, 'audit');
    }
    let passwordsReset = false;
    if (resetId && !await tx.auditEvent.findFirst({ where: { action: 'DEMO_PASSWORDS_RESET', targetId: resetId } })) {
      // Only the five synthetic identities belong to this maintenance operation.
      const targets = [];
      for (const account of demoAccounts) {
        const user = await tx.user.findUnique({ where: { emailHash: crypto.lookup(account.email, 'email') } });
        if (!user || user.role !== account.role || crypto.decrypt<{ email: string }>(user.profileCipher, `user:${user.id}`).email !== account.email) {
          throw new Error('As cinco contas fictícias esperadas precisam existir com seus perfis originais.');
        }
        targets.push({ account, user });
      }
      for (const { account, user } of targets) {
        await tx.user.update({ where: { id: user.id }, data: { passwordHash: await crypto.hashPassword(config.secret(account.passwordKey)), failedLogins: 0, lockedUntil: null } });
      }
      await tx.session.deleteMany({ where: { userId: { in: targets.map(({ user }) => user.id) } } });
      await tx.auditEvent.create({ data: { action: 'DEMO_PASSWORDS_RESET', targetId: resetId, detailCipher: crypto.encrypt({ synthetic: true, accounts: targets.length }, 'audit') } });
      passwordsReset = true;
    }
    let created = 0;
    for (let day = 1; day <= 7; day++) {
      for (const hour of [13, 14, 15]) {
        const startsAt = new Date(now); startsAt.setUTCDate(startsAt.getUTCDate() + day); startsAt.setUTCHours(hour, 0, 0, 0);
        if (!await tx.scheduleSlot.findFirst({ where: { serviceId, startsAt } })) {
          await tx.scheduleSlot.create({ data: { serviceId, resource: `${unitId}:demo`, startsAt, endsAt: new Date(startsAt.getTime() + 1800000), createdBy: marker } });
          created++;
        }
      }
    }
    return { initialized: !initialized, createdSlots: created, passwordsReset };
  }, { timeout: 30000 });
}

async function main() {
  const config = new ConfigService();
  validateDemoTarget(config);
  const prisma = new PrismaClient();
  try {
    const result = await seedDemo(prisma, config);
    process.stdout.write(`Demonstração preparada; ${result.createdSlots} horários fictícios adicionados. Redefinição de senhas: ${result.passwordsReset ? 'concluída' : 'não executada'}. Credenciais não são exibidas.\n`);
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(() => { process.stderr.write('Falha ao preparar demonstração. Confira ambiente, banco exclusivo, senhas e chaves originais.\n'); process.exitCode = 1; });
