/* Sessão HttpOnly; nenhum identificador de paciente é armazenado no navegador. */
(function () {
  'use strict';
  try { for (const key of ['sf_paciente', 'sf_agendamentos', 'sf_triagem']) localStorage.removeItem(key); } catch { /* Storage access is optional. */ }
  const api = location.port === '8000' ? `${location.protocol}//${location.hostname}:3001/api` : '/api';
  let user = null, csrf = '', sessionUnavailable = false;
  async function request(path, options = {}) {
    let response, body;
    try {
      response = await fetch(api + path, { ...options, signal: AbortSignal.timeout(15000), credentials: 'include', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(options.body && typeof options.body !== 'string' ? { body: JSON.stringify(options.body) } : {}) });
      body = await response.json();
    } catch {
      const uncertainBooking = path.startsWith('/solicitacoes') && options.method && options.method !== 'GET';
      const error = new Error('Não conseguimos conectar ao serviço. Confira sua conexão e tente novamente.' + (uncertainBooking ? ' Nenhuma confirmação foi recebida; consulte o histórico antes de repetir um agendamento.' : '')); error.status = 0; throw error;
    }
    if (!response.ok) {
      const message = response.status >= 500 ? 'O serviço está temporariamente indisponível. Tente novamente em instantes.' : response.status === 401 && path !== '/auth/login' ? 'Sua sessão terminou. Entre novamente para continuar.' : Array.isArray(body.message) ? 'Confira os campos preenchidos e os formatos indicados antes de continuar.' : body.message || 'Não foi possível concluir a operação.';
      const error = new Error(message);
      error.status = response.status; throw error;
    }
    return body;
  }
  const ready = request('/auth/me').then(result => { user = result.user; csrf = result.csrf; }).catch(error => { sessionUnavailable = error.status !== 401; });
  request('/operations/public-config').then(config => {
    if (!config.demo) return;
    const notice = make('aside', null, 'container notice');
    notice.setAttribute('aria-label', 'Ambiente de demonstração');
    notice.append(make('strong', 'Demonstração acadêmica'), make('p', 'Utilize apenas dados inventados. Os horários desta versão são fictícios e não reservam atendimento em uma UBS.'));
    const main = document.querySelector('main');
    if (main) main.before(notice);
  }).catch(() => {});
  async function requireAuth(roles) {
    await ready;
    if (sessionUnavailable) { connectionNotice(); return null; }
    if (!user) { location.replace('login.html'); return null; }
    if (roles && !roles.includes(user.role)) { location.replace(user.role === 'PATIENT' ? 'historico.html' : 'painel-profissional.html'); return null; }
    return user;
  }
  async function login(email, password) {
    const result = await request('/auth/login', { method: 'POST', body: { email, password } }); user = result.user; csrf = result.csrf; return user;
  }
  async function logout() { await request('/auth/logout', { method: 'POST' }); user = null; csrf = ''; location.replace('login.html'); }
  function make(tag, text, cls) { const element = document.createElement(tag); if (text != null) element.textContent = text; if (cls) element.className = cls; return element; }
  const statuses = {
    CONFIRMED: { label: 'Horário confirmado', tone: 'confirmed' }, IN_REVIEW: { label: 'Em atendimento', tone: 'analysis' },
    RESCHEDULE_REQUESTED: { label: 'Reagendamento necessário', tone: 'reagendado' }, COMPLETED: { label: 'Atendimento concluído', tone: 'done' }, CANCELLED: { label: 'Cancelado', tone: 'cancelado' },
  };
  const formatDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : 'Data não informada';
  const slotLabel = (slot, timezone = 'America/Cuiaba') => new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(slot.startsAt));
  function error(element, problem) { element.textContent = problem.message || String(problem); element.setAttribute('tabindex', '-1'); element.focus({ preventScroll: true }); }
  function connectionNotice() {
    if (document.getElementById('connection-notice')) return;
    const notice = make('div', null, 'notice warning'); notice.id = 'connection-notice'; notice.setAttribute('role', 'status');
    notice.append(make('p', 'Não conseguimos carregar sua conta. Seus dados não serão enviados enquanto o serviço estiver indisponível.'));
    const retry = make('button', 'Tentar novamente', 'btn btn-subtle'); retry.type = 'button'; retry.addEventListener('click', () => location.reload()); notice.append(retry); document.querySelector('main')?.prepend(notice);
    document.querySelectorAll('main form button, main form input, main form select, main form textarea').forEach(element => { element.disabled = true; });
  }
  async function busy(form, operation) {
    if (form.getAttribute('aria-busy') === 'true') return;
    form.setAttribute('aria-busy', 'true'); const buttons = [...form.querySelectorAll('button[type="submit"], button:not([type])')];
    buttons.forEach(button => { button.disabled = true; });
    try { return await operation(); } finally { form.setAttribute('aria-busy', 'false'); buttons.forEach(button => { button.disabled = false; }); }
  }
  function nextStep(item) {
    return ({ CONFIRMED: 'Seu horário está reservado. Compareça à unidade na data e no horário indicados.', IN_REVIEW: 'A equipe iniciou o atendimento. Acompanhe as orientações da unidade.', RESCHEDULE_REQUESTED: 'É necessário escolher outro horário. Use “Reagendar” ou entre em contato com a unidade.', COMPLETED: 'Este atendimento foi concluído. Para outro atendimento, faça um novo agendamento.', CANCELLED: 'O agendamento foi cancelado e o horário foi liberado. Você pode escolher outra vaga.' })[item.status] || 'Consulte a unidade para obter informações.';
  }
  window.SaudeFacil = Object.freeze({ ready, request, login, logout, requireAuth, user: () => user, make, formatDate, slotLabel, status: value => statuses[value] || { label: value, tone: 'pending' }, error, busy, nextStep });
  ready.then(() => {
    const nav = document.querySelector('.nav');
    const current = location.pathname.split('/').pop() || 'index.html';
    nav?.querySelectorAll('a').forEach(link => { if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page'); });
    if (nav && user) {
      const account = make('a', 'Minha conta'); account.href = 'conta.html'; nav.append(account);
      const button = make('button', 'Sair', 'btn btn-subtle btn-sm'); button.type = 'button'; button.addEventListener('click', () => logout().catch(() => { button.textContent = 'Falha ao sair. Tente novamente.'; })); nav.append(button);
    }
  });
})();
