(async () => {
  'use strict';
  const sf = SaudeFacil, $ = id => document.getElementById(id), user = await sf.requireAuth(['PATIENT']);
  if (!user) return;
  let units = [], slots = [], previous = null, mapAddress = '', page = 1, slotRequest = 0;
  const id = new URLSearchParams(location.search).get('reagendar');
  if (!user.verified) {
    $('erro').textContent = user.identityComplete ? 'Confira sua identidade presencialmente na unidade escolhida para liberar os horários.' : 'Complete sua identificação antes de agendar.';
    const link = sf.make('a', user.identityComplete ? 'Consultar minha conta' : 'Completar identificação', 'btn btn-primary'); link.href = user.identityComplete ? 'conta.html' : 'identificacao.html'; $('erro').after(link);
    $('confirmar').disabled = true; return;
  }
  async function loadSlots() {
    const generation = ++slotRequest; slots = []; $('horario').disabled = true;
    $('horario').replaceChildren(new Option('Selecione um horário', '')); $('maisHorarios').hidden = true;
    $('anteriorHorarios').hidden = true;
    const serviceId = $('servico').value;
    if (!serviceId) return;
    const query = new URLSearchParams({ serviceId, page, limit: 50 });
    const result = await sf.request('/catalog/slots?' + query);
    if (generation !== slotRequest) return;
    slots = result.items;
    slots.forEach(slot => $('horario').add(new Option(sf.slotLabel(slot, units.find(unit => unit.id === $('ubs').value).timezone), slot.id)));
    $('horario').disabled = !slots.length;
    $('maisHorarios').hidden = result.total <= page * 50;
    $('anteriorHorarios').hidden = page === 1;
    $('disponibilidade').textContent = result.total ? `${result.total} horários disponíveis. Página ${page}. Horários de Cáceres (MT).` : 'Nenhum horário disponível para este serviço nos próximos 90 dias.';
  }
  function selectUnit() {
    const unit = units.find(item => item.id === $('ubs').value);
    $('servico').replaceChildren(new Option('Selecione um serviço', ''));
    unit?.services.forEach(service => $('servico').add(new Option(service.name, service.id)));
    mapAddress = unit?.address || ''; $('localInfo').textContent = mapAddress || 'Selecione uma unidade.';
    $('mapFrame').hidden = true; $('mapFrame').removeAttribute('src'); $('carregarMapa').disabled = !mapAddress;
    $('abrirRotas').hidden = !mapAddress;
    if (mapAddress) $('abrirRotas').href = 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(mapAddress);
    page = 1; loadSlots().catch(error => sf.error($('erro'), error));
  }
  try {
    units = await sf.request('/catalog/units');
    units.forEach(unit => $('ubs').add(new Option(unit.name, unit.id)));
    if (id) {
      previous = await sf.request('/solicitacoes/' + encodeURIComponent(id));
      $('ubs').value = previous.unitId; selectUnit(); $('servico').value = previous.serviceId;
      $('ubs').disabled = true; $('servico').disabled = true; $('sintomas').closest('.field').hidden = true; $('ditar').parentElement.hidden = true; $('confirmar').textContent = 'Confirmar reagendamento'; document.querySelector('h1').textContent = 'Escolher novo horário'; await loadSlots();
    }
    if (!units.length) $('disponibilidade').textContent = 'Nenhuma unidade disponível para agendamento no momento. Tente novamente mais tarde.';
  } catch (error) { sf.error($('erro'), error); }
  $('ubs').addEventListener('change', selectUnit);
  $('servico').addEventListener('change', () => { page = 1; loadSlots().catch(error => sf.error($('erro'), error)); });
  $('maisHorarios').addEventListener('click', () => { page++; loadSlots().catch(error => sf.error($('erro'), error)); });
  $('anteriorHorarios').addEventListener('click', () => { page--; loadSlots().catch(error => sf.error($('erro'), error)); });
  $('form').addEventListener('submit', async event => {
    event.preventDefault(); $('erro').textContent = '';
    if (!slots.some(slot => slot.id === $('horario').value)) { $('erro').textContent = 'Selecione um horário disponível.'; return; }
    $('confirmar').disabled = true;
    try {
      const item = previous ? await sf.request(`/solicitacoes/${previous.id}/reschedule`, { method: 'POST', body: { version: previous.version, slotId: $('horario').value } }) : await sf.request('/solicitacoes', { method: 'POST', body: { slotId: $('horario').value, reason: $('sintomas').value.trim() } });
      location.href = 'confirmacao.html?id=' + encodeURIComponent(item.id);
    } catch (error) { sf.error($('erro'), error); await loadSlots().catch(() => {}); $('confirmar').disabled = false; }
  });
  $('carregarMapa').addEventListener('click', async () => {
    const address = mapAddress; if (!address) return;
    try {
      const response = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(address));
      if (!response.ok) throw new Error('Use a busca no OpenStreetMap para consultar o endereço.');
      const result = await response.json(); if (address !== mapAddress) return;
      const lat = Number(result[0]?.lat), lon = Number(result[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Localização não encontrada. Confira com a unidade.');
      $('mapFrame').src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent([lon - .008, lat - .006, lon + .008, lat + .006].join(',')) + '&marker=' + encodeURIComponent(lat + ',' + lon); $('mapFrame').hidden = false;
    } catch (error) { sf.error($('localInfo'), error); }
  });
})();
