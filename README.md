# Saúde Fácil — MVP navegável do Ciclo 4 (Problema 4)

**UNEMAT • Ciência da Computação • Tópicos Avançados em Desenvolvimento de Software • 2026/2**  
**Entrega 4:** 06/11/2026

## Propósito e limite do MVP

Revisão da interface anterior, baseada no documento `TADS_Problema4_Modelo_Claro_Icones.pptx.pdf`, com foco em **dois públicos: pacientes/responsáveis e profissionais de saúde**. O sistema demonstra tarefas e mudanças de estado com dados fictícios em um mesmo navegador, **sem backend, sem autenticação, sem agendamento real, sem conexão com o SUS e sem classificação de risco clínica**.

**Não usar dados reais. Não usar como software clínico ou sistema de gestão de UBS.**

## Como executar

1. Extraia o ZIP preservando todos os arquivos e a pasta `assets/`.
2. No terminal na pasta extraída, execute `python3 -m http.server 8000` (ou use a extensão Live Server do VS Code).
3. Abra `http://localhost:8000/index.html` no navegador.
4. Escolha o fluxo **Paciente** ou **Profissional**, exibidos lado a lado na tela inicial (inclusive no celular). A barra de navegação abre pelo botão **Menu** em telas estreitas.

`index.html` também pode ser aberto diretamente, mas um servidor local oferece navegação mais previsível. O Google Maps requer conexão à internet, e o mapa incorporado só carrega depois de um clique.

## Fluxo principal — paciente / responsável

1. `index.html` → escolha o perfil **Paciente**.
2. `cadastro.html` → clique **Preencher dados fictícios**, aceite a confirmação, e continue.
3. `triagem.html` → insira uma queixa *fictícia* e clique **Analisar queixa fictícia**. Se houver uma expressão de alerta monitorada, a orientação é exibida imediatamente; caso contrário, o sistema pede uma resposta complementar antes de apresentar a orientação. Observe o aviso de que não é diagnóstico.
4. `agendamento.html` → escolha UBS, serviço e data de preferência. Veja opcionalmente a localização. Confirme o registro.
5. `confirmacao.html` → tela de sucesso com código, UBS, data, serviço e status.
6. `historico.html` → consulte, cancele ou altere a data (se ainda não encerrado).

Se o texto contiver expressões de alerta ou se a resposta complementar indicar possível emergência, o protótipo exibe recomendação de buscar ajuda; não libera a continuação a partir dessa orientação. O sistema não compreende completamente negações, contexto ou gravidade clínica.

## Fluxo principal — profissional de saúde

1. `index.html` → perfil **Profissional**.
2. `acesso-profissional.html` → entrada demonstrativa **sem login real**.
3. `painel-profissional.html` → botão **Carregar exemplos fictícios** (opcional); veja indicadores, pesquise um paciente e filtre por status.
4. `atendimento-profissional.html?id=...` → abra um registro, consulte o resumo e altere seu status para **Em análise**, **Nova data necessária** ou **Atendimento finalizado**. A finalização pede confirmação.
5. Volte ao painel; se o registro for do paciente fictício atualmente cadastrado, observe o novo status também em `historico.html`.

As duas áreas compartilham o `localStorage` **do mesmo navegador e da mesma origem**. Não é sincronização multiusuário e não tem controle de acesso.

## Estrutura

- `index.html`: escolha do público
- `cadastro.html`, `triagem.html`, `agendamento.html`, `confirmacao.html`, `historico.html`: percurso do paciente
- `acesso-profissional.html`, `painel-profissional.html`, `atendimento-profissional.html`: percurso do profissional
- `assets/style.css`: estilos globais, responsividade, seleção de perfil em duas colunas e componentes
- `assets/nav.js`: abertura e fechamento acessíveis do menu responsivo
- `assets/app.js`: estado local, validações utilitárias, formatação, status e dados demonstrativos
- `assets/profissional.js`: fila, filtros e atualização de status
- `REQUISITOS_ATUALIZADOS.md`: requisitos, funcionalidades, prioridades e decisões do redesign
- `WIREFRAMES_E_FLUXOS.md`: telas de baixa fidelidade descritas em blocos e fluxos de cliques
- `ROTEIRO_TESTES.md`: tarefas, critérios de observação e checklist de acessibilidade

## Decisões de UI/UX vinculadas ao material do professor

- **Públicos diferentes, tarefas diferentes:** paciente tem instruções curtas, passo a passo e confirmação; profissional tem painel de leitura rápida e filtros.
- **Visibilidade do status:** confirmação explícita e etiquetas textuais para o andamento; feedback após atualização.
- **Prevenção de erros:** formulários validados, confirmação antes de cancelar/finalizar, textos de ajuda.
- **Reconhecimento em vez de lembrança:** campos com rótulos, navegação com etapas, histórico com informações essenciais.
- **Consistência:** mesma paleta, barra de navegação no topo de todas as telas e componentes em todos os fluxos.
- **Acessibilidade:** estados com texto e cor, labels, `aria-live`, navegação por teclado, foco visível, toque mínimo de ~44 px, responsividade e suporte a zoom.
- **LGPD:** dados fictícios, sem envio a servidor; nenhum controle de privacidade pronto para uso real.

## Funcionalidades herdadas do Problema 3

- Mapa por UBS no agendamento: endereços da lista municipal; o endereço da UBS Vila Irene precisa de confirmação e o mapa dela segue bloqueado.
- Regra didática de orientação de sintomas: análise automática inicial das expressões da queixa; apenas quando nenhuma expressão é encontrada aparece uma pergunta complementar objetiva. **Não é diagnóstico, triagem clínica ou classificação de risco**; o material dos Cadernos de Atenção Básica nº 28 (Ministério da Saúde) é uma referência, mas não foi transformado em protocolo validado.
- JSON HL7 FHIR R4 demonstrativo em modal: **não validado oficialmente**, sem atribuição automática de CID-10.

## Critérios de aceitação para avaliação acadêmica

- O estudante consegue realizar o fluxo de paciente do início até a tela de confirmação.
- O estudante consegue realizar o fluxo do profissional do acesso até a atualização de status.
- Uma alteração profissional aparece no painel e, no mesmo navegador, no histórico do paciente fictício correspondente.
- O usuário entende a diferença entre solicitação *fictícia* e consulta marcada de verdade.
- As telas são navegáveis com mouse e teclado em desktop e celular.
- O documento de requisitos atualizado está disponível e há roteiro de testes para revisão por pares.

## Limitações e próximos passos para produção

Faltam backend, banco de dados, login com perfis, segregação de pacientes por identidade verificada, auditoria, disponibilidade real das UBS, consentimento e bases legais da LGPD, criptografia e segurança, integração com o SUS/RNDS, validação FHIR e revisão clínica das orientações. **Nenhuma dessas lacunas é resolvida apenas com HTML/JS ou localStorage.**

### Referências da demonstração

- Documento entregue pelo professor: *Problema 4 — Interfaces para Pacientes e Profissionais de Saúde* (slides 3–4, 8–15, 17–22 e 24).
- https://www.nngroup.com/articles/ten-usability-heuristics/
- https://www.gov.br/ds/
- https://www.w3.org/WAI/standards-guidelines/wcag/
- https://bvsms.saude.gov.br/bvs/publicacoes/acolhimento_demanda_espontanea_queixas_comuns_cab28v2.pdf
- https://www.caceres.mt.gov.br/Telefones-e-Enderecos/Secretaria-municipal-de-saude-7///3/
