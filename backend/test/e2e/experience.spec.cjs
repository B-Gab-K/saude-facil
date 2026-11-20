const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const login = async (page, email) => {
  await page.goto('/login.html'); await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill('Browser-Test-Only123!'); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await page.waitForURL(email.startsWith('patient') ? '**/historico.html' : '**/painel-profissional.html');
};
test('cadastro inicial só pede nome, e-mail e senha; identificação fica em etapa posterior', async ({ page }) => {
  await page.goto('/cadastro.html'); await expect(page.locator('form input')).toHaveCount(3);
  await page.getByLabel('Nome completo').fill('Pessoa Cadastro Teste'); await page.getByLabel('E-mail', { exact: true }).fill('onboarding@example.test'); await page.getByLabel('Senha', { exact: true }).fill('Browser-Test-Only123!'); await page.getByRole('button', { name: 'Criar conta e continuar' }).click();
  await page.waitForURL('**/identificacao.html'); await expect(page.getByRole('heading', { name: 'Complete sua identificação' })).toBeVisible();
  await page.getByRole('link', { name: 'Completar depois' }).click(); await expect(page.getByRole('link', { name: 'Completar identificação' })).toBeVisible();
});
test('reserva, reagendamento e cancelamento mostram situação e próximo passo', async ({ page }) => {
  await login(page, 'patient@example.test'); await page.goto('/agendamento.html');
  await page.getByLabel('Unidade', { exact: true }).selectOption({ label: 'Unidade para testes' }); await page.getByLabel('Serviço', { exact: true }).selectOption({ label: 'Atendimento de teste' });
  await expect(page.locator('#horario option')).toHaveCount(4); await page.locator('#horario').selectOption({ index: 1 }); await page.getByRole('button', { name: 'Confirmar agendamento', exact: true }).click();
  await page.waitForURL('**/confirmacao.html?*'); await expect(page.getByText('Horário confirmado', { exact: true })).toBeVisible(); await expect(page.getByText(/Seu horário está reservado/)).toBeVisible();
  await page.goto('/historico.html'); await page.getByRole('link', { name: 'Reagendar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Escolher novo horário' })).toBeVisible();
  await expect(page.locator('#horario option')).toHaveCount(3); await page.locator('#horario').selectOption({ index: 1 }); await page.getByRole('button', { name: 'Confirmar reagendamento' }).click(); await page.waitForURL('**/confirmacao.html?*');
  await page.goto('/historico.html'); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(page.getByText(/O agendamento foi cancelado/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reagendar', exact: true })).toHaveCount(0);
});
test('falha da API informa conexão e mantém os campos do formulário', async ({ page }) => {
  await page.goto('/login.html'); await page.getByLabel('E-mail', { exact: true }).fill('patient@example.test'); await page.getByLabel('Senha', { exact: true }).fill('Browser-Test-Only123!');
  await page.route('**/api/auth/login', route => route.abort('failed')); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não conseguimos conectar'); await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('patient@example.test'); await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
});
test('teclado, semântica, contraste e reflow nas telas públicas e áreas autenticadas', async ({ page }) => {
  const audit = async path => {
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await page.goto(path); await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toContainText(/demonstração|fictíci|dados inventados|revisão institucional.*pendente/i);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), path + ' ' + width).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path + ' reflow').toBe(true);
    }
  };
  for (const path of ['/index.html', '/cadastro.html', '/login.html', '/triagem.html']) await audit(path);
  await page.goto('/login.html'); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  await login(page, 'patient@example.test'); for (const path of ['/historico.html', '/agendamento.html', '/conta.html']) await audit(path);
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await page.waitForURL('**/login.html');
  await login(page, 'admin@example.test'); for (const path of ['/painel-profissional.html', '/gestao.html', '/identidades.html']) await audit(path);
});
