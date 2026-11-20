(async () => {
  const sf = SaudeFacil;
  try {
    const policy = await sf.request('/guidance');
    document.getElementById('descricao').textContent = policy.message;
    document.getElementById('emergencia').textContent = policy.emergency;
    const review = document.getElementById('revisao');
    review.hidden = !policy.review;
    review.textContent = policy.review ? `Revisão profissional em ${new Date(policy.review.approvedAt).toLocaleDateString('pt-BR')}.` : '';
    policy.sources.forEach(source => { const li = sf.make('li'), link = sf.make('a', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; li.append(link); document.getElementById('fontes').append(li); });
  } catch (error) { sf.error(document.getElementById('erro'), error); }
})();
