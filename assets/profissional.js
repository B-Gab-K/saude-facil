/* Fluxo demonstrativo do profissional; não concede privilégios ou login reais. */
(async () => {
 'use strict';
 await SaudeFacil.ready;
 const $=id=>document.getElementById(id), sf=SaudeFacil;
 const current=location.pathname.split('/').pop();
 const normalize=s=>String(s||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(current==='painel-profissional.html'){
   function render(){
     const todos=sf.appointments(), termo=normalize($('busca').value.trim()), filtro=$('filtro').value;
     $('qtdTodas').textContent=todos.length;
     $('qtdPendentes').textContent=todos.filter(a=>sf.status(a.status).tone==='pending').length;
     $('qtdAnalise').textContent=todos.filter(a=>sf.status(a.status).tone==='analysis').length;
     const vistos=todos.filter(a=>{
       const raw=[a.paciente?.nome||'João Fictício',a.codigo,a.ubs,a.servico].join(' ');
       return normalize(raw).includes(termo)&&(!filtro||sf.status(a.status).tone===filtro);
     });
     $('fila').replaceChildren(); $('contagem').textContent=`${vistos.length} de ${todos.length} solicitações exibidas`;
     if(!vistos.length){$('fila').append(sf.make('div',todos.length?'Nenhuma solicitação corresponde à pesquisa.':'Nenhuma solicitação registrada. Use o botão de exemplos abaixo para começar.','empty'));return;}
     vistos.forEach(a=>{
       const item=sf.make('article',null,'queue-item'), left=document.createElement('div');
       const name=sf.make('h3',a.paciente?.nome||'João Fictício');
       const loc=sf.make('p',`${a.servico} • ${a.ubs}`);
       const date=sf.make('p',`${sf.formatDate(a.data)} · Código ${a.codigo}`);
       left.append(name,loc,date);
       const middle=sf.make('div',null,'queue-status');middle.append(sf.make('span',sf.status(a.status).label,'status '+sf.status(a.status).tone));
       const action=sf.make('div',null,'queue-action');const link=sf.make('a','Ver detalhes','btn btn-primary btn-sm');link.href='atendimento-profissional.html?id='+encodeURIComponent(a.id);action.append(link);
       item.append(left,middle,action);$('fila').append(item);
     });
   }
   $('busca').addEventListener('input',render);$('filtro').addEventListener('change',render);
   $('limpar').addEventListener('click',()=>{$('busca').value='';$('filtro').value='';render();$('busca').focus();});
   $('exemplos').addEventListener('click',async()=>{const ok=await sf.seedDemo();$('msg').textContent=ok?'Três exemplos foram adicionados.':'Os exemplos já foram carregados ou não foi possível acessar a API.';render();});
   if(!sf.online()) $('msg').textContent='Não foi possível acessar a API. Verifique o servidor e o banco de dados.';
   render();
 }
 if(current==='atendimento-profissional.html'){
   const id=new URLSearchParams(location.search).get('id');
   let item=sf.appointments().find(a=>a.id===id);
   const detalhe=$('detalhe');
   function renderDetail(){
     detalhe.replaceChildren();
     if(!item){detalhe.append(sf.make('p','Solicitação não encontrada neste navegador.','notice warning'));$('secaoAcao').hidden=true;return;}
     const head=sf.make('div',null,'appointment-top');
     const prof=sf.make('div',null,'profile');prof.append(sf.make('span',sf.initials(item.paciente?.nome||'João Fictício'),'avatar'));
     const wrap=document.createElement('div');wrap.append(sf.make('h2',item.paciente?.nome||'João Fictício'),sf.make('p','Código '+item.codigo,'small'));prof.append(wrap);
     head.append(prof,sf.make('span',sf.status(item.status).label,'status '+sf.status(item.status).tone));detalhe.append(head);
     const dl=sf.make('dl',null,'detail-list');
     const fields=[['Unidade',item.ubs],['Serviço solicitado',item.servico],['Data preferida',sf.formatDate(item.data)],['Horário',item.hora||'A confirmar'],['Queixa simulada',item.triagemResumo||'Não informada'],['Última atualização',item.atualizadoEm?new Date(item.atualizadoEm).toLocaleDateString('pt-BR'):'Não informada']];
     fields.forEach(([label,value])=>{const div=sf.make('div',null,'detail-pair');div.append(sf.make('dt',label),sf.make('dd',value));dl.append(div);});detalhe.append(dl);
     if(item.observacao){const note=sf.make('div',null,'notice');note.append(sf.make('strong','Observação da equipe (simulada)'),sf.make('p',item.observacao));detalhe.append(note);}
     const terminal=['CANCELADO','ATENDIMENTO FINALIZADO'].includes(item.status);
     $('secaoAcao').hidden=terminal;
     if(terminal)detalhe.append(sf.make('p','Este registro está encerrado nesta simulação e não pode ser alterado pela equipe.','notice'));
   }
   $('formStatus').addEventListener('submit',async e=>{
     e.preventDefault(); const value=$('situacao').value, observacao=$('observacao').value.trim();
     if(!['EM ANÁLISE','REAGENDAMENTO SOLICITADO','ATENDIMENTO FINALIZADO'].includes(value)){$('erro').textContent='Selecione a nova situação antes de salvar.';$('situacao').focus();return;}
     if(item?.status==='CANCELADO'||item?.status==='ATENDIMENTO FINALIZADO'){$('erro').textContent='Este registro já foi encerrado.';return;}
     if(value==='ATENDIMENTO FINALIZADO' && !confirm('Confirmar a finalização fictícia deste registro?'))return;
     if(!await sf.updateAppointment(id,{status:value,observacao})){$('erro').textContent='Não foi possível salvar na API.';return;}
     item=sf.appointments().find(a=>a.id===id);renderDetail();$('secaoAcao').hidden=false;$('formStatus').hidden=true;$('salvo').hidden=false;
     $('salvoTexto').textContent='Nova situação: '+sf.status(value).label+'. Confira a mudança no painel ou no histórico do paciente.';
     $('salvo').scrollIntoView({block:'nearest'});$('salvo').focus?.();
   });
   renderDetail();
 }
})();
