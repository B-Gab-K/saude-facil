(async () => {
  'use strict';
  const sf = SaudeFacil, $ = id => document.getElementById(id), user = await sf.requireAuth(['RECEPTION', 'NURSE', 'COORDINATOR', 'ADMIN']); if (!user) return;
  if (location.pathname.endsWith('painel-profissional.html')) {
    let page = 1;
    $('perfil').textContent = `${user.nome} · ${user.role}`;
    $('gestao').hidden = !['ADMIN', 'COORDINATOR'].includes(user.role);
    $('identidades').hidden = !['ADMIN', 'COORDINATOR', 'RECEPTION'].includes(user.role);
    $('revisaoClinica').hidden = user.role !== 'NURSE';
    async function load() {
      try {
        const query = new URLSearchParams({ page, limit: 20, sort: 'startsAt', order: 'asc' });
        if ($('busca').value.trim()) query.set('q', $('busca').value.trim()); if ($('filtro').value) query.set('status', $('filtro').value);
        const result = await sf.request('/solicitacoes?' + query); $('fila').replaceChildren();
        if (!result.items.length) $('fila').append(sf.make('p', 'Nenhum agendamento encontrado.', 'empty'));
        result.items.forEach(item => {
          const row = sf.make('article', null, 'queue-item'), info = sf.make('div'), state = sf.status(item.status), link = sf.make('a', 'Ver detalhes', 'btn btn-primary btn-sm');
          info.append(sf.make('h2', item.paciente.nome), sf.make('p', `${item.servico} · ${item.ubs}`), sf.make('p', `${sf.formatDate(item.data)} às ${item.hora}`, 'small'));
          info.append(sf.make('p', item.overdue ? 'Prazo de revisão administrativa vencido' : item.firstReviewedAt ? 'Revisão administrativa registrada' : item.responseDueAt ? `Revisar até ${new Date(item.responseDueAt).toLocaleString('pt-BR')}` : 'Prazo de revisão não configurado', item.overdue ? 'error' : 'help'));
          link.href = 'atendimento-profissional.html?id=' + encodeURIComponent(item.id); row.append(info, sf.make('span', state.label, 'status ' + state.tone), link); $('fila').append(row);
        });
        $('pagina').textContent = `Página ${page} · ${result.total} atendimentos`; $('anterior').disabled = page === 1; $('proxima').disabled = result.total <= page * 20; $('msg').textContent = '';
      } catch (error) { sf.error($('msg'), error); }
    }
    $('filtros').addEventListener('submit', event => { event.preventDefault(); page = 1; load(); });
    $('anterior').addEventListener('click', () => { page--; load(); }); $('proxima').addEventListener('click', () => { page++; load(); }); await load();
  } else {
    let item;
    const id = new URLSearchParams(location.search).get('id');
    async function load() {
      item = await sf.request('/solicitacoes/' + encodeURIComponent(id || '')); $('detalhe').replaceChildren();
      const dl = sf.make('dl', null, 'detail-list');
      const fields = [['Paciente', item.paciente.nome], ['Código', item.codigo], ['Unidade', item.ubs], ['Serviço', item.servico], ['Data e horário', `${sf.formatDate(item.data)} às ${item.hora}`], ['Situação', sf.status(item.status).label]];
      if (item.triagemResumo) fields.push(['Motivo autorrelatado', item.triagemResumo]);
      if (item.observacao) fields.push(['Observação administrativa', item.observacao]);
      fields.forEach(([label, value]) => { const pair = sf.make('div', null, 'detail-pair'); pair.append(sf.make('dt', label), sf.make('dd', value)); dl.append(pair); }); $('detalhe').append(dl);
      if (['ADMIN', 'COORDINATOR', 'RECEPTION'].includes(user.role) && !['COMPLETED', 'CANCELLED'].includes(item.status)) {
        const staff = await sf.request('/catalog/staff'), form = sf.make('form', null, 'form-stack section'), label = sf.make('label', 'Responsável pela revisão administrativa'), select = sf.make('select');
        select.id = 'responsavel'; label.htmlFor = select.id; select.required = true; select.add(new Option('Selecione o responsável', ''));
        staff.filter(person => person.unitId === item.unitId).forEach(person => select.add(new Option(person.nome, person.id))); select.value = item.assignedToId || '';
        form.append(label, select, sf.make('p', 'A atribuição registra a revisão administrativa. O horário do paciente continua reservado.', 'help'), sf.make('button', 'Atribuir e registrar revisão', 'btn btn-subtle')); $('detalhe').append(form);
        form.addEventListener('submit', async event => { event.preventDefault(); await sf.busy(form, async () => {
          try { await sf.request(`/solicitacoes/${item.id}/assignment`, { method: 'POST', body: { assigneeId: select.value, version: item.version } }); await load(); $('erro').textContent = 'Responsável e revisão registrados.'; } catch (error) { sf.error($('erro'), error); }
        }); });
      }
      const transitions = { CONFIRMED: ['IN_REVIEW', 'RESCHEDULE_REQUESTED', 'CANCELLED'], IN_REVIEW: ['COMPLETED', 'RESCHEDULE_REQUESTED', 'CANCELLED'], RESCHEDULE_REQUESTED: ['CANCELLED'], COMPLETED: [], CANCELLED: [] };
      $('observacao').value = item.observacao || '';
      $('situacao').replaceChildren(new Option('Selecione uma ação', ''));
      transitions[item.status].filter(value => value !== 'COMPLETED' || ['NURSE', 'ADMIN'].includes(user.role)).forEach(value => $('situacao').add(new Option(sf.status(value).label, value)));
      $('formStatus').hidden = ['COMPLETED', 'CANCELLED'].includes(item.status);
    }
    $('formStatus').addEventListener('submit', async event => {
      event.preventDefault();
      try { await sf.request('/solicitacoes/' + item.id, { method: 'PATCH', body: { status: $('situacao').value, version: item.version, observation: $('observacao').value.trim() } }); await load(); $('erro').textContent = 'Alteração salva.'; }
      catch (error) { sf.error($('erro'), error); }
    });
    try { await load(); } catch (error) { sf.error($('detalhe'), error); $('formStatus').hidden = true; }
  }
})();
