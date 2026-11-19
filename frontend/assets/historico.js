(async () => {
  'use strict';
  const sf = SaudeFacil, $ = id => document.getElementById(id), user = await sf.requireAuth(['PATIENT']); if (!user) return;
  let page = 1;
  if (!user.verified) $('mensagem').textContent = 'Sua conta foi criada. Confira sua identidade presencialmente na unidade escolhida para liberar agendamentos.';
  async function load() {
    try {
      const result = await sf.request('/solicitacoes?' + new URLSearchParams({ page, limit: 20 })); $('lista').replaceChildren();
      if (!result.items.length) $('lista').append(sf.make('p', 'Nenhum agendamento encontrado.', 'empty'));
      result.items.forEach(item => {
        const card = sf.make('article', null, 'appointment'), text = sf.make('div'), status = sf.status(item.status);
        text.append(sf.make('h2', item.servico), sf.make('p', `${item.ubs} · ${sf.formatDate(item.data)} às ${item.hora}`), sf.make('p', `Código: ${item.codigo}`, 'small'), sf.make('span', status.label, 'status ' + status.tone));
        if (item.observacao) text.append(sf.make('p', item.observacao, 'notice'));
        card.append(text);
        if (!['COMPLETED', 'CANCELLED'].includes(item.status)) {
          const actions = sf.make('div', null, 'actions'), reschedule = sf.make('a', 'Reagendar', 'btn btn-subtle'), cancel = sf.make('button', 'Cancelar', 'btn btn-danger');
          reschedule.href = 'agendamento.html?reagendar=' + encodeURIComponent(item.id); cancel.type = 'button';
          cancel.addEventListener('click', async () => {
            if (!confirm('Cancelar este agendamento e liberar o horário?')) return;
            try { await sf.request('/solicitacoes/' + item.id, { method: 'PATCH', body: { status: 'CANCELLED', version: item.version } }); await load(); }
            catch (error) { sf.error($('mensagem'), error); }
          }); actions.append(reschedule, cancel); card.append(actions);
        } $('lista').append(card);
      });
      $('pagina').textContent = `Página ${page} · ${result.total} agendamentos`; $('anterior').disabled = page === 1; $('proxima').disabled = result.total <= page * 20;
    } catch (error) { sf.error($('mensagem'), error); }
  }
  $('anterior').addEventListener('click', () => { page--; load(); }); $('proxima').addEventListener('click', () => { page++; load(); }); await load();
})();
