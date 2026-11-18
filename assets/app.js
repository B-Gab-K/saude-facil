/* Saúde Fácil - MVP acadêmico. SOMENTE dados inteiramente fictícios; nunca use em produção. */
(function () {
  'use strict';
  const keys = { paciente:'sf_paciente', consultas:'sf_agendamentos', triagem:'sf_triagem' };
  let cache = [];
  let apiError = false;
  const api = 'http://localhost:3001/api/solicitacoes';
  async function request(path = '', options = {}) {
    const response = await fetch(api + path, { ...options, headers: {'Content-Type':'application/json'} });
    if (!response.ok) throw new Error('Falha na API');
    return response.json();
  }
  const ready = request().then(items => { cache = items; }).catch(() => { apiError = true; });
  function online() { return !apiError; }
  function read(key, fallback) {
    try { const raw = localStorage.getItem(keys[key]); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(keys[key], JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  const demoPatient = {nome:'João Fictício', cpf:'000.000.000-00', sus:'000000000000000', nasc:'1990-01-01'};
  function patient() {
    const p=read('paciente',null);
    return p && typeof p.nome === 'string' && p.nome.trim() ? p : {...demoPatient};
  }
  function appointments() {
    const list=cache;
    return Array.isArray(list) ? list.filter(x=>x && x.id && x.data && x.ubs).slice(0,100) : [];
  }
  function ownAppointments() {
    const current=patient().cpf.replace(/\D/g,'');
    return appointments().filter(a => typeof a.paciente?.cpf !== 'string' || a.paciente.cpf.replace(/\D/g,'') === current);
  }
  function todayPlusOne() {
    const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+1);
    return isoDate(d);
  }
  function isoDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function daysFromToday(days) { const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return isoDate(d); }
  function formatDate(iso) { const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(iso||''); return m?`${m[3]}/${m[2]}/${m[1]}`:'Data não informada'; }
  function id() { return globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
  function code() { return 'SF-'+Math.random().toString(36).slice(2,8).toUpperCase(); }
  const STATUSES={
    'SOLICITAÇÃO RECEBIDA':{label:'Solicitação recebida',tone:'pending'},
    'SOLICITAÇÃO FICTÍCIA':{label:'Solicitação recebida',tone:'pending'},
    'EM ANÁLISE':{label:'Em análise',tone:'analysis'},
    'REAGENDAMENTO SOLICITADO':{label:'Nova data necessária',tone:'reagendado'},
    'REAGENDAMENTO SIMULADO':{label:'Solicitação atualizada',tone:'pending'},
    'ATENDIMENTO FINALIZADO':{label:'Atendimento finalizado',tone:'done'},
    'CANCELADO':{label:'Cancelado',tone:'cancelado'}
  };
  function status(status) { return STATUSES[status] || {label:'Solicitação recebida',tone:'pending'}; }
  async function updateAppointment(id, patch) {
    try { const item=await request('/'+encodeURIComponent(id), {method:'PATCH',body:JSON.stringify(patch)}); cache=cache.map(a=>a.id===id?item:a); return true; }
    catch (_) { return false; }
  }
  async function saveAppointment(item) {
    try { const saved=await request('',{method:'POST',body:JSON.stringify(item)}); cache.unshift(saved); return true; } catch (_) { return false; }
  }
  async function deleteAppointment(id) {
    try { await request('/'+encodeURIComponent(id),{method:'DELETE'}); cache=cache.filter(a=>a.id!==id); return true; } catch (_) { return false; }
  }
  async function seedDemo() {
    const list=appointments();
    if (list.some(x=>x.paciente?.nome==='Maria Exemplo')) return false;
    const template=[
      {paciente:{...demoPatient},servico:'Clínico Geral',ubs:'UBS São Miguel',data:daysFromToday(2),status:'SOLICITAÇÃO RECEBIDA',triagemResumo:'Febre e dor de garganta há dois dias (simulação)'},
      {paciente:{nome:'Maria Exemplo',cpf:'111.111.111-11',nasc:'1985-07-16'},servico:'Enfermagem',ubs:'UBS Cavalhada (Dr. Ademar R. de Oliveira)',data:daysFromToday(3),status:'EM ANÁLISE',triagemResumo:'Solicitação de acompanhamento (simulação)'},
      {paciente:{nome:'Ana Demonstração',cpf:'222.222.222-22',nasc:'2002-02-02'},servico:'Vacinação',ubs:'UBS São Miguel',data:daysFromToday(4),status:'REAGENDAMENTO SOLICITADO',triagemResumo:'Informações de vacinação (simulação)'}
    ];
    for (const a of template) if (!await saveAppointment({...a,id:id(),codigo:code()})) return false;
    return true;
  }
  function initials(nome) {return String(nome||'P').split(/\s+/).slice(0,2).map(x=>x.charAt(0).toUpperCase()).join('');}
  function make(tag,content,cls) { const el=document.createElement(tag); if(content!=null)el.textContent=content; if(cls)el.className=cls; return el; }
  function initHeader() { document.querySelectorAll('[data-first-name]').forEach(el=>el.textContent=patient().nome.trim().split(/\s+/)[0]); }
  window.SaudeFacil=Object.freeze({read,write,patient,appointments,ownAppointments,todayPlusOne,daysFromToday,formatDate,id,code,status,updateAppointment,saveAppointment,deleteAppointment,seedDemo,make,initials,initHeader,ready,online});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initHeader); else initHeader();
})();
