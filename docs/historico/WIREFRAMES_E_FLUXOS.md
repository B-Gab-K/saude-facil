# Saúde Fácil — Wireframes e fluxos (baixa fidelidade)

Os wireframes abaixo descrevem **a estrutura e a prioridade visual**, sem depender da implementação gráfica. Atendem à solicitação da atividade do slide 22: três telas centrais por público, conectadas por cliques. As telas complementares fazem parte do protótipo navegável HTML.

## 1. Fluxo de paciente / responsável

```text
┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
│ 1. CADASTRO            │    │ 2. ORIENTAÇÃO          │    │ 3. SOLICITAÇÃO         │
│ Saúde Fácil            │    │ Saúde Fácil            │    │ Saúde Fácil            │
│ 1 · 2 · 3              │    │ 1 · [2] · 3            │    │ 1 · 2 · [3]            │
│                        │    │                        │    │                        │
│ Nome [____________]    │    │ Sintomas fictícios     │    │ UBS [Selecionar    v] │
│ CPF  [____________]    │    │ [________________]     │    │ Serviço [__________]  │
│ Nasc [__/__/____]      │    │ Alerta? ( )Sim ( )Não  │    │ Data   [__/__/____]   │
│ [Dados fictícios]      │    │ [Analisar situação]    │    │ [Ver localização]     │
│                        │    │ Resultado explicativo  │    │                        │
│ [Continuar →]          │───>│ [Continuar →]          │───>│ [Registrar pedido →]  │
└────────────────────────┘    └────────────────────────┘    └────────────────────────┘
                                                                 │
                                                                 v
                                                      ┌──────────────────────────┐
                                                      │ CONFIRMAÇÃO              │
                                                      │ ✓ Pedido fictício salvo  │
                                                      │ Código / UBS / data      │
                                                      │ [Ver meu histórico]      │
                                                      └──────────────────────────┘
```

**Tarefa:** concluir pedido simulado e reconhecer que a data não é reserva oficial.

## 2. Fluxo de profissional de UBS

```text
┌────────────────────────┐    ┌───────────────────────────┐    ┌────────────────────────────┐
│ 1. ACESSO DEMO        │    │ 2. PAINEL DE PEDIDOS      │    │ 3. DETALHES                │
│ Área profissional     │    │ Saúde Fácil / equipe      │    │ ← Voltar ao painel         │
│                        │    │ Resumo: total / pendentes │    │ Paciente fictício         │
│ Uso acadêmico          │    │                           │    │ UBS / serviço / data       │
│ Sem autenticação       │    │ [Pesquisar___________]   │    │ Status atual               │
│                        │    │ [Filtrar por status  v]   │    │                            │
│ [Entrar demo →]       │───>│ João / UBS / [Detalhes] │───>│ [Nova situação       v]   │
│                        │    │ Maria / UBS / [Detalhes]│    │ [Observação fictícia]     │
│                        │    │                           │    │ [Salvar atualização]      │
└────────────────────────┘    └───────────────────────────┘    └────────────────────────────┘
                                                                        │
                                                                        v
                                                           Feedback: alteração registrada
```

**Tarefa:** localizar um registro por nome/código e atualizar seu andamento com poucas etapas.

## 3. Por que o layout ficou assim

- **Cabeçalho:** indica área do paciente/profissional e navegação.
- **Conteúdo principal:** destaca primeiro a tarefa da tela; evita apresentar funcionalidades técnicas como prioridade.
- **Ação principal:** botão de cor de destaque e verbo claro.
- **Feedback:** mensagens após envio/alteração, status escrito por extenso e erros próximos do formulário.
- **Progressão:** números 1–3 deixam o percurso visível, mesmo com telas adicionais de histórico e confirmação.

## 4. O que ainda falta validar com usuários

- Pacientes reconhecem que a data é apenas uma preferência?
- Profissionais encontram rapidamente o registro desejado?
- A diferenciação entre “Solicitação recebida” e “Atendimento finalizado” é clara?
- O mapa é encontrado sem roubar atenção da tarefa principal?
- As expressões da orientação de sintomas são compreendidas como **não diagnósticas**?


## Ajuste da interface — navegação e tela de acesso (05/11/2026)

- Todas as páginas incluem barra de navegação no topo. No desktop, os itens aparecem horizontalmente; em telas até 800 px, o menu é acionado pelo botão **Menu**, com indicação de aberto/fechado e suporte à tecla Escape.
- A página inicial coloca os cartões **Paciente** e **Profissional da UBS** lado a lado mesmo em telas estreitas. Textos e rótulos de ação ficam compactos no celular, evitando a necessidade de rolar para escolher o perfil.
- O menu distingue os dois fluxos: nas telas do paciente aparecem Início, Cadastro, Orientação, Solicitar e Meu histórico; nas telas profissionais, Início, Acesso e Solicitações.
