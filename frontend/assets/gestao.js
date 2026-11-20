(async () => {
  'use strict';
  const sf = SaudeFacil, $ = id => document.getElementById(id), page = location.pathname.split('/').pop();
  const roles = page === 'revisao-clinica.html' ? ['NURSE'] : page === 'identidades.html' ? ['ADMIN', 'COORDINATOR', 'RECEPTION'] : ['ADMIN', 'COORDINATOR'];
  const user = await sf.requireAuth(roles); if (!user) return;
  if (page === 'identidades.html') {
    async function load() {
      const users = await sf.request('/users/pending'); $('lista').replaceChildren();
      if (!users.length) $('lista').append(sf.make('p', 'Nenhuma identidade aguardando conferência.', 'empty'));
      users.forEach(patient => {
        const card = sf.make('article', null, 'appointment'); card.append(sf.make('h2', patient.nome), sf.make('p', `CPF: ${patient.cpf} · Nascimento: ${sf.formatDate(patient.nasc)}`));
        const form = sf.make('form', null, 'form-stack'), label = sf.make('label', 'Referência da conferência presencial de identidade'), input = sf.make('input'); input.id = 'evidence-' + patient.id; label.htmlFor = input.id; input.required = true; input.minLength = 10; input.maxLength = 500;
        const button = sf.make('button', 'Registrar identidade conferida', 'btn btn-primary'); form.append(label, input, button); card.append(form);
        form.addEventListener('submit', async event => { event.preventDefault(); try { await sf.request(`/users/${patient.id}/verify`, { method: 'POST', body: { evidence: input.value.trim() } }); await load(); } catch (error) { sf.error($('erro'), error); } }); $('lista').append(card);
      });
    }
    try { await load(); } catch (error) { sf.error($('erro'), error); } return;
  }
  if (page === 'revisao-clinica.html') {
    try {
      const content = await sf.request('/guidance'); $('conteudoRevisao').textContent = `${content.version}\n${content.message}\n\n${content.emergency}`;
      $('formRevisao').addEventListener('submit', async event => {
        event.preventDefault();
        try { await sf.request('/guidance/reviews', { method: 'POST', body: { evidence: $('evidence').value.trim(), expiresAt: new Date($('expiresAt').value).toISOString() } }); $('erro').textContent = 'Revisão registrada. O conteúdo permanece educativo, sem triagem automatizada.'; }
        catch (error) { sf.error($('erro'), error); }
      });
    } catch (error) { sf.error($('erro'), error); } return;
  }
  async function load() {
    const [units, staff] = await Promise.all([sf.request('/catalog/management'), sf.request('/catalog/staff')]); $('lista').replaceChildren(); $('unitId').replaceChildren(new Option('Selecione a unidade', '')); $('serviceId').replaceChildren(new Option('Selecione o serviço', '')); $('staffUnit').replaceChildren(new Option('Selecione a unidade', ''));
    units.forEach(unit => {
      $('unitId').add(new Option(unit.name, unit.id)); $('staffUnit').add(new Option(unit.name, unit.id));
      const card = sf.make('article', null, 'appointment'); card.append(sf.make('h2', unit.name), sf.make('p', unit.address), sf.make('p', unit.active ? 'Unidade validada' : 'Aguardando validação institucional', 'small'));
      if (!unit.active) approval(card, 'units', unit.id);
      const operation = sf.make('form', null, 'form-stack section'), ownerLabel = sf.make('label', 'Responsável pela revisão administrativa'), owner = sf.make('select'), deadlineLabel = sf.make('label', 'Prazo da primeira revisão, em minutos corridos'), deadline = sf.make('input');
      owner.id = 'owner-' + unit.id; ownerLabel.htmlFor = owner.id; owner.required = true; owner.add(new Option('Selecione a pessoa responsável', ''));
      staff.filter(person => person.unitId === unit.id).forEach(person => owner.add(new Option(person.nome, person.id))); owner.value = unit.responsibleUserId || '';
      deadline.id = 'deadline-' + unit.id; deadlineLabel.htmlFor = deadline.id; deadline.type = 'number'; deadline.min = '15'; deadline.max = '10080'; deadline.required = true; deadline.value = unit.responseMinutes || '';
      operation.append(ownerLabel, owner, deadlineLabel, deadline, sf.make('p', 'Prazo administrativo para novas reservas. Não altera a confirmação nem o horário do atendimento. Defina conforme a escala da unidade.', 'help'), sf.make('button', 'Salvar responsável e prazo', 'btn btn-subtle')); card.append(operation);
      operation.addEventListener('submit', async event => { event.preventDefault(); await sf.busy(operation, async () => { try { await sf.request(`/catalog/units/${unit.id}/operations`, { method: 'POST', body: { responsibleUserId: owner.value, responseMinutes: Number(deadline.value) } }); await load(); $('erro').textContent = 'Responsável e prazo salvos.'; } catch (error) { sf.error($('erro'), error); } }); });
      unit.services.forEach(service => {
        const box = sf.make('div'); box.append(sf.make('h3', service.name), sf.make('p', service.active ? 'Serviço validado' : 'Oferta pendente de validação', 'small'));
        if (!service.active) approval(box, 'services', service.id);
        if (service.active) $('serviceId').add(new Option(`${unit.name} · ${service.name}`, service.id)); card.append(box);
      }); $('lista').append(card);
    });
  }
  function approval(container, type, id) {
    const form = sf.make('form', null, 'form-stack'), label = sf.make('label', 'Referência da validação institucional'), input = sf.make('input');
    input.id = 'approval-' + id; label.htmlFor = input.id; input.required = true; input.minLength = 10; input.maxLength = 500;
    const button = sf.make('button', 'Validar e publicar', 'btn btn-subtle'); form.append(label, input, button); container.append(form);
    form.addEventListener('submit', async event => { event.preventDefault(); try { await sf.request(`/catalog/${type}/${id}/approve`, { method: 'POST', body: { evidence: input.value.trim() } }); await load(); } catch (error) { sf.error($('erro'), error); } });
  }
  $('formUnidade').hidden = user.role !== 'ADMIN'; $('formEquipe').hidden = user.role !== 'ADMIN';
  const forms = [
    ['formUnidade', '/catalog/units', () => ({ name: $('unitName').value, address: $('address').value, sourceUrl: $('sourceUrl').value })],
    ['formServico', '/catalog/services', () => ({ unitId: $('unitId').value, name: $('serviceName').value, evidence: $('serviceEvidence').value })],
    ['formHorario', '/catalog/slots', () => ({ serviceId: $('serviceId').value, resource: $('resource').value, startsAt: $('startsAt').value, endsAt: $('endsAt').value })],
    ['formEquipe', '/users/staff', () => ({ nome: $('staffName').value, email: $('staffEmail').value, password: $('staffPassword').value, role: $('staffRole').value, unitId: $('staffUnit').value })],
  ];
  forms.forEach(([id, path, body]) => $(id).addEventListener('submit', async event => {
    event.preventDefault();
    try { await sf.request(path, { method: 'POST', body: body() }); $(id).reset(); await load(); $('erro').textContent = 'Registro salvo.'; }
    catch (error) { sf.error($('erro'), error); }
  }));
  try { await load(); } catch (error) { sf.error($('erro'), error); }
})();
