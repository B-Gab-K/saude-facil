// Comportamento da navegação no celular. Os links permanecem visíveis sem JavaScript.
(() => {
  'use strict';
  const header = document.querySelector('.page-head');
  const toggle = header?.querySelector('.nav-toggle');
  const menu = header?.querySelector('.nav');
  if (!header || !toggle || !menu) return;
  document.documentElement.classList.add('nav-js');

  const closeMenu = () => {
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.nav-toggle-icon').textContent = '☰';
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    header.classList.toggle('nav-open', !expanded);
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.querySelector('.nav-toggle-icon').textContent = expanded ? '☰' : '✕';
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
