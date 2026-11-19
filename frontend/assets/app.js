/* Sessão HttpOnly; nenhum identificador de paciente é armazenado no navegador. */
(function () {
  'use strict';
  try { for (const key of ['sf_paciente', 'sf_agendamentos', 'sf_triagem']) localStorage.removeItem(key); } catch { /* Storage access is optional. */ }
  const api = location.port === '8000' ? `${location.protocol}//${location.hostname}:3001/api` : '/api';
  let user = null, csrf = '';
  async function request(path, options = {}) {
    const response = await fetch(api + path, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(options.body && typeof options.body !== 'string' ? { body: JSON.stringify(options.body) } : {}) });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message || 'Não foi possível concluir a operação.');
      error.status = response.status; throw error;
    }
    return body;
  }
  const ready = request('/auth/me').then(result => { user = result.user; csrf = result.csrf; }).catch(error => { if (error.status !== 401) console.warn('Sessão indisponível.'); });
  async function requireAuth(roles) {
    await ready;
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
    CONFIRMED: { label: 'Agendado', tone: 'pending' }, IN_REVIEW: { label: 'Em atendimento', tone: 'analysis' },
    RESCHEDULE_REQUESTED: { label: 'Reagendamento necessário', tone: 'reagendado' }, COMPLETED: { label: 'Atendimento concluído', tone: 'done' }, CANCELLED: { label: 'Cancelado', tone: 'cancelado' },
  };
  const formatDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : 'Data não informada';
  const slotLabel = (slot, timezone = 'America/Cuiaba') => new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(slot.startsAt));
  function error(element, problem) { element.textContent = problem.message || String(problem); }
  window.SaudeFacil = Object.freeze({ ready, request, login, logout, requireAuth, user: () => user, make, formatDate, slotLabel, status: value => statuses[value] || { label: value, tone: 'pending' }, error });
  ready.then(() => {
    const nav = document.querySelector('.nav');
    if (nav && user) {
      const account = make('a', 'Minha conta'); account.href = 'conta.html'; nav.append(account);
      const button = make('button', 'Sair', 'btn btn-subtle btn-sm'); button.type = 'button'; button.addEventListener('click', () => logout().catch(() => { button.textContent = 'Falha ao sair. Tente novamente.'; })); nav.append(button);
    }
  });
})();
