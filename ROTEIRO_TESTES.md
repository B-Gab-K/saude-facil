# Saúde Fácil — Roteiro de teste de usabilidade e acessibilidade

**Objetivo:** observar se uma pessoa consegue realizar as tarefas centrais do paciente ou do profissional e identificar pontos de hesitação, conforme o Problema 4 (slides 21–22). **Não aplique dados reais nem solicite relatos verdadeiros de saúde.**

## Preparação

1. Abra o site localmente e use apenas dados de demonstração.
2. Convide pelo menos duas pessoas que não desenvolveram as telas; idealmente uma usa o fluxo paciente e outra o profissional.
3. Não explique onde clicar: leia só a tarefa e observe a navegação.
4. Anote cliques equivocados, pedidos de ajuda, onde houve hesitação e termos incompreendidos. Peça consentimento se for registrar imagem/voz (opcional).

## Teste A — paciente / responsável

**Cenário fictício:** João Fictício deseja registrar uma preferência de data para Clínica Geral.

| Tarefa | Critério de sucesso | Observações do avaliador |
|---|---|---|
| Escolher entrada de paciente | Identifica opção sem ajuda | |
| Cadastrar dados de demonstração | Consegue usar o preenchimento fictício | |
| Entender orientação | Analisa a descrição e responde à pergunta complementar quando ela aparece; reconhece que não é diagnóstico | |
| Escolher UBS, serviço e data | Preenche os 3 campos sem erros confusos | |
| Encontrar mapa | Acha opção de localização da UBS | |
| Confirmar e consultar histórico | Identifica código/status e entende que não é reserva real | |

## Teste B — profissional de saúde

**Cenário fictício:** a equipe deve localizar o pedido de João Fictício e marcar “Em análise”.

| Tarefa | Critério de sucesso | Observações do avaliador |
|---|---|---|
| Entrar na área profissional | Localiza o acesso da equipe | |
| Carregar exemplos fictícios | Reconhece dados demonstrativos | |
| Localizar João por pesquisa | Usa busca sem explorar todas as páginas | |
| Abrir detalhes | Identifica UBS, data, serviço, status | |
| Mudar para “Em análise” | Salva sem ajuda e recebe feedback | |
| Conferir atualização | Novo status aparece no painel e histórico | |

## Perguntas rápidas pós-tarefa (escala 1–5)

- Ficou claro o que fazer primeiro?
- Você entendeu o significado dos botões?
- Foi fácil encontrar a informação desejada?
- O tamanho do texto e dos botões foi confortável?
- Em algum momento você pensou que isso era um agendamento ou atendimento **real**?

## Checklist de acessibilidade (verificação manual)

- [ ] Teclado: é possível percorrer links, campos e botões com Tab e Shift+Tab.
- [ ] O foco ativo é claramente visível.
- [ ] Formulários possuem rótulos compreensíveis, não apenas placeholder.
- [ ] Informações de status aparecem em texto, não somente em cores.
- [ ] Teste com zoom do navegador em 200% sem sobreposição nem rolagem horizontal desnecessária.
- [ ] Teste com viewport de 360 px / 390 px e desktop 1280 px.
- [ ] Mensagens de erro ou sucesso são perceptíveis a leitores de tela (`role=alert`/`role=status`).
- [ ] Botões e áreas de toque têm tamanho adequado para interação por toque.
- [ ] Recursos externos (mapa) mostram contexto e não são carregados sem ação explícita.

## Registro da rodada de testes (preencher pelo grupo)

| Participante fictício / perfil | Tarefa | Concluiu? | Tempo | Onde hesitou | Correção proposta |
|---|---|---|---|---|---|
| Teste 1 — paciente | | | | | |
| Teste 2 — profissional | | | | | |

**Observação:** este documento é **um roteiro preparado**, não um relatório de testes concluídos. Preencha os resultados com observações reais da equipe, sem inventar medidas, antes da entrega.

## Testes específicos da análise automática (somente textos fictícios)

| Texto/ação simulada | Comportamento esperado |
|---|---|
| Campo vazio + clicar em analisar | Exibir mensagem de erro; nenhuma orientação é salva |
| “Estou com falta de ar” | Exibir orientação de possível emergência sem exigir pergunta complementar |
| “Febre e dor de garganta há dois dias” | Exibir a pergunta complementar, sem presumir ausência de risco |
| Selecionar “Sim” na pergunta | Exibir orientação de possível emergência; botão para continuar oculto |
| Selecionar “Não sei dizer” | Exibir orientação para avaliação humana; botão para continuar oculto |
| Selecionar “Não observado” | Exibir orientação genérica de avaliação na UBS; permitir seguir para a próxima tela, com aviso de limites |
| Modificar o texto depois de obter resultado | Ocultar resultado anterior e exigir nova análise |
| Deixar a pergunta complementar sem resposta | Impedir resultado; mostrar mensagem de validação |

**Limite clínico:** a verificação por expressões não é um instrumento validado de triagem. Frases negativas e relatos de sintomas passados podem acionar alertas; sintomas graves descritos de outras maneiras podem não ser identificados.


## Revisão adicional — barra de navegação e escolha de acesso

- [ ] Abrir `index.html` em 1440 × 900, 390 × 844 e 320 × 720: os dois perfis permanecem lado a lado, com os botões de acesso visíveis antes da primeira rolagem.
- [ ] No desktop, observar barra de navegação com a página atual identificada.
- [ ] No celular, abrir o botão **Menu**, navegar com Tab e fechar com Escape; o botão reflete o estado `aria-expanded`.
- [ ] Abrir Cadastro, Orientação, Solicitar, Histórico, Acesso profissional e Solicitações pela barra.
- [ ] Verificar que os fluxos preexistentes de cadastro/triagem, solicitação e atendimento profissional continuam funcionando.
