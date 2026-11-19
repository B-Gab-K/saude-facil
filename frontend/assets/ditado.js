(() => {
  'use strict';
  const button = document.getElementById('ditar');
  const status = document.getElementById('ditado-status');
  const field = document.getElementById('sintomas');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    button.disabled = true;
    status.textContent = 'A transcrição de voz não está disponível neste navegador. Você pode digitar a queixa.';
    return;
  }
  const recognition = new Recognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = false;
  let listening = false;
  recognition.onstart = () => { listening = true; button.textContent = '■ Parar transcrição'; status.textContent = 'Ouvindo. Fale e pressione o botão para parar.'; };
  recognition.onresult = event => {
    let text = '';
    for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) text += event.results[i][0].transcript + ' ';
    if (text) { field.value = (field.value.trim() + ' ' + text.trim()).trim().slice(0, field.maxLength); field.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  recognition.onerror = event => { status.textContent = event.error === 'not-allowed' ? 'Acesso ao microfone negado. Permita o acesso no navegador ou digite a queixa.' : 'Não foi possível transcrever. Tente novamente ou digite a queixa.'; };
  recognition.onend = () => { listening = false; button.textContent = 'Ditar motivo do atendimento'; };
  button.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }
    try { recognition.start(); } catch (_) { status.textContent = 'Não foi possível iniciar o microfone. Tente novamente.'; }
  });
})();
