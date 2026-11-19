(async () => {
  const sf = SaudeFacil;
  try {
    const policy = await sf.request('/guidance');
    document.getElementById('descricao').textContent = policy.message;
    document.getElementById('emergencia').textContent = policy.emergency;
    document.getElementById('revisao').textContent = policy.review ? `Revisão profissional registrada em ${new Date(policy.review.approvedAt).toLocaleDateString('pt-BR')}. Conteúdo educativo, sem classificação de risco.` : 'Conteúdo educativo geral. Revisão institucional por responsável clínico pendente.';
    policy.sources.forEach(source => { const li = sf.make('li'), link = sf.make('a', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; li.append(link); document.getElementById('fontes').append(li); });
  } catch (error) { sf.error(document.getElementById('erro'), error); }
})();
