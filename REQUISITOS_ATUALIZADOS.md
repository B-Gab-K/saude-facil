# Saúde Fácil — Requisitos atualizados após redesenho

**Versão:** MVP acadêmico do Problema 4 • 04/11/2026  
**Contexto:** projeto de disciplina, baseado no documento do professor e no protótipo do Problema 3.

## 1. Problema de interface identificado

O documento do Ciclo 4 (slide 3) descreve botões confusos, profissionais perdendo tempo para localizar dados e textos pequenos ou técnicos. O slide 4 solicita MVP e requisitos atualizados em 06/11/2026. O slide 9 exige considerar públicos com necessidades distintas; o slide 19 recomenda fluxos navegáveis completos para ambos.

## 2. Público e tarefa prioritária

| Persona fictícia para teste | Necessidade | Tarefa principal no MVP | Evitar |
|---|---|---|---|
| **Paula**, 46 anos, responsável familiar | Saber onde pedir atendimento e entender os próximos passos | Cadastrar dados fictícios → orientação inicial → solicitar data → ver confirmação | Termos técnicos, informação sem contexto, passos longos |
| **Rafael**, 31 anos, recepcionista de UBS | Encontrar solicitações rapidamente e registrar movimentações | Entrar na demo → filtrar pedido → abrir detalhes → alterar andamento | Cliques excessivos, leitura demorada, registros sem status |

Essas personas **são hipóteses fictícias do grupo**, ainda não validadas com usuários reais.

## 3. Requisitos funcionais (RF)

| ID | Prioridade | Requisito | Tela / demonstração |
|---|---|---|---|
| RF01 | Alta | Separar claramente a entrada em paciente e profissional | `index.html` |
| RF02 | Alta | Permitir cadastro *fictício* com validação básica de campos | `cadastro.html` |
| RF03 | Alta | Analisar primeiro as expressões da queixa fictícia e apresentar pergunta complementar apenas quando nenhuma expressão monitorada for identificada, sem atribuir diagnóstico | `triagem.html` |
| RF04 | Alta | Registrar solicitação de preferência por UBS, serviço e data | `agendamento.html` |
| RF05 | Alta | Exibir confirmação inequívoca após salvar solicitação | `confirmacao.html` |
| RF06 | Alta | Mostrar ao paciente seu histórico e os status textuais | `historico.html` |
| RF07 | Alta | Fornecer acesso demonstrativo da equipe, sem simular login verdadeiro | `acesso-profissional.html` |
| RF08 | Alta | Listar, pesquisar e filtrar pedidos fictícios | `painel-profissional.html` |
| RF09 | Alta | Permitir atualização de andamento de uma solicitação | `atendimento-profissional.html` |
| RF10 | Média | Exibir mapa/rota da UBS quando o endereço foi confirmado para o protótipo | `agendamento.html` |
| RF11 | Média | Permitir reagendamento ou cancelamento com confirmação | `agendamento.html` e `historico.html` |
| RF12 | Média | Exibir JSON HL7 FHIR didático de interoperabilidade | `triagem.html` |

## 4. Requisitos não funcionais (RNF)

| ID | Requisito | Critério verificável na demonstração |
|---|---|---|
| RNF01 | Responsividade | Layout não força rolagem horizontal em larguras de 360–390 px; botões tocáveis |
| RNF02 | Legibilidade | Texto de corpo ~16 px; conteúdo distingue títulos e ajuda; zoom até 200% sem perda essencial |
| RNF03 | Acessibilidade | Labels visíveis, foco de teclado, `aria-live` em confirmações e erros, ícone não é a única indicação de estado |
| RNF04 | Consistência | Navegação e nomes dos status padronizados entre páginas |
| RNF05 | Eficiência | Profissional encontra um registro por nome/UBS/código sem abrir múltiplas páginas |
| RNF06 | Prevenção de erros | Campos obrigatórios validados; cancelamento e encerramento pedem confirmação |
| RNF07 | Segurança da demonstração | Conteúdo avisa usar somente dados fictícios; nenhuma gravação remota |
| RNF08 | Transparência | A interface não descreve agendamentos como vagas confirmadas e não apresenta diagnóstico médico |

## 5. Regras de negócio simuladas

- Cada solicitação possui ID interno, código de demonstração, UBS, serviço, data preferida, registro de paciente fictício e status.
- Situações previstas: `SOLICITAÇÃO RECEBIDA`, `EM ANÁLISE`, `REAGENDAMENTO SOLICITADO`, `ATENDIMENTO FINALIZADO`, `CANCELADO`.
- Apenas registros ainda não encerrados podem ser alterados pela equipe no protótipo.
- O paciente pode alterar data de preferência e cancelar registros ainda não encerrados.
- Status exibidos em linguagem simples; a cor apenas complementa o texto.
- A área do profissional e do paciente compartilham as informações **somente na mesma origem de navegador**.
- Nenhuma regra implementa disponibilidade real, fila clínica ou prioridade médica.

## 6. Mudanças do Problema 3 para o Problema 4

| Antes | Depois | Justificativa UI/UX |
|---|---|---|
| Entrada única sem diferenciação de papéis | Seleção paciente / profissional | Alinhar tarefa à necessidade de cada público |
| Não havia interface para equipe de UBS | Novo painel e detalhes de solicitação | Agilizar consulta e atualização |
| Solicitação retornava diretamente para histórico | Tela própria de confirmação | Visibilidade do resultado da ação |
| Status textual livre sem padronização geral | Conjunto de status e rótulos acessíveis | Consistência e clareza |
| Navegação sem identificação de progresso | Etapas visíveis em cadastro, orientação e solicitação | Reconhecer posição no fluxo |
| Simulação dependia de preencher tudo | Botão que injeta exemplos fictícios | Teste rápido por avaliadores |

## 7. Ajuste de UX — orientação inicial por etapas

- O paciente não precisa classificar previamente se há um “sinal de alerta”; primeiro digita a queixa e solicita a análise.
- Se o texto contiver expressão monitorada de possível alerta, o sistema mostra a recomendação de buscar atendimento de emergência imediatamente, sem aguardar resposta adicional.
- Quando nenhuma expressão for identificada, o sistema apresenta uma pergunta complementar em linguagem simples (Sim / Não observado / Não sei dizer).
- Se a resposta for “Não sei dizer”, o sistema orienta avaliação humana e não habilita a progressão pela orientação.
- A continuação pelo fluxo da triagem só aparece após a opção “Não observado”, sempre com aviso explícito de que a ausência de detecção não descarta urgências.
- A análise permanece baseada em palavras e regras; não interpreta com segurança negações, contextos ou gravidade. O fluxo foi alterado **para reduzir redundância**, não para alegar validação clínica.

## 8. Decisões pendentes / futuras

1. **Validar com as UBS** serviços oferecidos, endereços e disponibilidade; há divergência em fontes sobre a localização da Vila Irene.
2. **Validar com usuários** o entendimento dos termos e a velocidade de localizar solicitações.
3. **Validar com profissionais clínicos** qualquer regra futura de triagem; o sistema atual é só informativo.
4. **Arquitetar backend** para login, autorização, histórico e integridade de dados; `localStorage` não serve para dados reais.
5. **Aplicar diretrizes de privacidade** e gestão de dados sensíveis em implantação real.

## 9. Rastreabilidade ao documento do professor

- Situação-problema e entrega: slides 3–5.
- Perfis, usuários e contexto de saúde: slides 8–11.
- Heurísticas, prevenção de erros e princípios visuais: slides 12–15.
- Protótipo navegável e fluxos para dois públicos: slides 17–19.
- Testes com outras pessoas e registro de decisões: slides 21–22.
- Entrega e requisitos atualizados: slide 24.
