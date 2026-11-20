(async () => {
  const sf = SaudeFacil, $ = id => document.getElementById(id);
  if (!await sf.requireAuth()) return;
  function render(state) {
    $('emailConsent').checked = state.consented;
    $('email-status').textContent = !state.available ? 'Os avisos por e-mail ainda não foram ativados pela instituição.' : !state.consented ? 'Avisos desativados. Nenhum envio será feito sem sua autorização.' : state.verified ? 'Avisos ativados e endereço confirmado.' : 'Confira sua caixa de entrada e confirme o código abaixo. Ele vale por 24 horas.';
    $('formEmailVerify').hidden = !state.consented || state.verified;
    $('emailConsent').disabled = !state.available && !state.consented;
  }
  try { render(await sf.request('/notifications')); } catch (error) { sf.error($('email-error'), error); }
  $('formAvisos').addEventListener('submit', async event => {
    event.preventDefault(); await sf.busy($('formAvisos'), async () => {
      try { render(await sf.request('/notifications/consent', { method: 'POST', body: { enabled: $('emailConsent').checked } })); $('email-error').textContent = ''; }
      catch (error) { sf.error($('email-error'), error); }
    });
  });
  $('formEmailVerify').addEventListener('submit', async event => {
    event.preventDefault(); await sf.busy($('formEmailVerify'), async () => {
      try { render(await sf.request('/notifications/verify', { method: 'POST', body: { token: $('emailToken').value.trim() } })); $('emailToken').value = ''; $('email-error').textContent = ''; }
      catch (error) { sf.error($('email-error'), error); }
    });
  });
})();
