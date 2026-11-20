(async () => {
  'use strict';
  const sf = SaudeFacil, $ = id => document.getElementById(id);
  const page = location.pathname.split('/').pop();
  if (page === 'cadastro.html') {
    $('form').addEventListener('submit', async event => {
      event.preventDefault(); $('salvar').disabled = true; $('erro').textContent = '';
      try {
        await sf.request('/auth/register', { method: 'POST', body: { email: $('email').value.trim(), password: $('password').value, nome: $('nome').value.trim() } });
        await sf.login($('email').value.trim(), $('password').value); location.href = 'identificacao.html';
      } catch (error) { sf.error($('erro'), error); $('salvar').disabled = false; }
    });
  } else if (page === 'identificacao.html') {
    const user = await sf.requireAuth(['PATIENT']); if (!user) return;
    if (user.verified) { location.replace('historico.html'); return; }
    $('nasc').max = new Date().toISOString().slice(0, 10);
    try {
      const units = await sf.request('/catalog/units'); units.forEach(unit => $('unitId').add(new Option(unit.name, unit.id)));
      if (!units.length) { $('erro').textContent = 'Sua conta já foi criada. Ainda não há unidades disponíveis para conferência de identidade; você pode completar esta etapa depois.'; $('form').querySelector('button').disabled = true; }
    }
    catch (error) { sf.error($('erro'), error); }
    $('form').addEventListener('submit', async event => {
      event.preventDefault();
      await sf.busy($('form'), async () => {
        try { await sf.request('/auth/identity', { method: 'POST', body: { cpf: $('cpf').value.replace(/\D/g, ''), nasc: $('nasc').value, unitId: $('unitId').value } }); location.href = 'historico.html'; }
        catch (error) { sf.error($('erro'), error); }
      });
    });
  } else if (page === 'login.html' || page === 'acesso-profissional.html') {
    $('form').addEventListener('submit', async event => {
      event.preventDefault(); $('entrar').disabled = true;
      try { const user = await sf.login($('email').value.trim(), $('password').value); location.href = user.role === 'PATIENT' ? 'historico.html' : 'painel-profissional.html'; }
      catch (error) { sf.error($('erro'), error); $('entrar').disabled = false; }
    });
  } else if (page === 'conta.html') {
    const user = await sf.requireAuth(); if (!user) return;
    $('perfil').textContent = `${user.nome} · ${user.verified ? 'Identidade conferida' : user.identityComplete ? 'Aguardando conferência presencial de identidade na unidade escolhida' : 'Complete sua identificação para agendar'}`;
    if (user.role === 'PATIENT' && !user.identityComplete) { const link = sf.make('a', 'Completar identificação'); link.href = 'identificacao.html'; $('perfil').append(' · ', link); }
    $('form').addEventListener('submit', async event => {
      event.preventDefault();
      try { await sf.request('/auth/password', { method: 'POST', body: { currentPassword: $('currentPassword').value, newPassword: $('newPassword').value } }); location.replace('login.html'); }
      catch (error) { sf.error($('erro'), error); }
    });
  }
})();
