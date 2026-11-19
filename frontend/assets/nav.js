// Comportamento da navegação no celular. Os links permanecem visíveis sem JavaScript.
(() => {
  'use strict';
  const path = location.pathname.split('/').pop() || 'index.html';
  const professional = /profissional|gestao|identidades|revisao-clinica/.test(path);
  const icons = {
    home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9 21v-7h6v7'],
    user: ['M20 21a8 8 0 0 0-16 0', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
    heart: ['M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z', 'M6.5 12h3l1.2-2.2 2.1 4.4 1.2-2.2h3.5'],
    calendar: ['M4 6h16v15H4z', 'M8 3v6M16 3v6M4 10h16', 'M9 15h6M12 12v6'],
    history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l3 2'],
    dashboard: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
    access: ['M12 3 5 6v5c0 4.5 2.6 7.9 7 10 4.4-2.1 7-5.5 7-10V6l-7-3Z', 'M9 12l2 2 4-4']
  };
  const links = professional
    ? [['index.html','Início','home'], ['painel-profissional.html','Painel','dashboard'], ['acesso-profissional.html','Acesso','access']]
    : [['index.html','Início','home'], ['login.html','Entrar','user'], ['triagem.html','Orientação','heart'], ['agendamento.html','Agendar','calendar'], ['historico.html','Histórico','history']];
  const bottom = document.createElement('nav');
  bottom.className = 'bottom-nav';
  bottom.setAttribute('aria-label', 'Navegação inferior');
  links.forEach(([href, label, icon]) => {
    const link = document.createElement('a');
    link.href = href;
    const iconWrap = document.createElement('span');
    iconWrap.className = 'bottom-nav-icon';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    icons[icon].forEach(d => { const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); shape.setAttribute('d', d); svg.append(shape); });
    iconWrap.append(svg);
    const text = document.createElement('span');
    text.className = 'bottom-nav-label';
    text.textContent = label;
    link.append(iconWrap, text);
    if (href === path || (path === 'confirmacao.html' && href === 'agendamento.html') || (path === 'atendimento-profissional.html' && href === 'painel-profissional.html')) link.setAttribute('aria-current', 'page');
    bottom.append(link);
  });
  document.body.append(bottom);
  const header = document.querySelector('.page-head');
  const toggle = header?.querySelector('.nav-toggle');
  const menu = header?.querySelector('.nav');
  if (!header || !toggle || !menu) return;
  document.documentElement.classList.add('nav-js');

  const closeMenu = () => {
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    const icon = toggle.querySelector('[aria-hidden]'); if (icon) icon.textContent = '☰';
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    header.classList.toggle('nav-open', !expanded);
    toggle.setAttribute('aria-expanded', String(!expanded));
    const icon = toggle.querySelector('[aria-hidden]'); if (icon) icon.textContent = expanded ? '☰' : '✕';
  });

  menu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) {
      closeMenu();
      toggle.focus();
    }
  });

  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });

  const desktop = window.matchMedia('(min-width: 801px)');
  desktop.addEventListener('change', event => {
    if (event.matches) closeMenu();
  });
})();
