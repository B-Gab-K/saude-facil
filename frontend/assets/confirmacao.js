(async () => {
  const sf = SaudeFacil; if (!await sf.requireAuth(['PATIENT'])) return;
  const root = document.getElementById('resumo'), id = new URLSearchParams(location.search).get('id');
  try {
    const item = await sf.request('/solicitacoes/' + encodeURIComponent(id || ''));
    const dl = sf.make('dl', null, 'detail-list');
    [['Código', item.codigo], ['Unidade', item.ubs], ['Serviço', item.servico], ['Data', sf.formatDate(item.data)], ['Horário', item.hora], ['Situação', sf.status(item.status).label]].forEach(([label, value]) => { const pair = sf.make('div', null, 'detail-pair'); pair.append(sf.make('dt', label), sf.make('dd', value)); dl.append(pair); }); root.append(dl);
  } catch (error) { sf.error(root, error); }
})();
