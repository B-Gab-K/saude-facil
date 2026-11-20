# Roteiro de usabilidade e avaliação assistiva

Status em 20/11/2026: roteiro preparado; **nenhuma sessão com participantes externos foi realizada pelo agente**. Os testes automatizados de navegador e axe estão separados dos resultados humanos. Falta indicar facilitador, participantes e agenda de execução.

## Preparação

Usar homologação isolada com dados inventados e e-mail de teste controlado, ou desenvolvimento com captura local. Explicar que estamos avaliando o sistema, não a pessoa, e que ela pode interromper a sessão. Não pedir CPF, sintomas ou documentos reais para este teste. Registrar participantes por código, sem nomes no relatório técnico; gravação somente com autorização específica e destinação/retenção acordadas.

Convidar pessoas com níveis diferentes de familiaridade digital, incluindo pessoas mais velhas, pessoas que usam apenas celular e usuários de tecnologia assistiva. Incluir profissionais que realmente executarão a rotina da unidade. Uma avaliação pequena identifica barreiras, mas não representa estatisticamente toda a população.

## Tarefas do paciente

1. Criar uma conta e dizer quais dados foram necessários inicialmente.
2. Encontrar a etapa de identificação e explicar por que precisa conferir a identidade na unidade.
3. Em conta fictícia já conferida, localizar um serviço, selecionar uma vaga e agendar.
4. Explicar se o horário está confirmado e qual é o próximo passo.
5. Encontrar o agendamento no histórico, trocar o horário e depois cancelar.
6. Diante de indisponibilidade simulada, explicar a mensagem e decidir como retomar sem duplicar reserva.
7. Encontrar preferências de e-mail, ativar, confirmar o código de captura e depois cancelar o consentimento.

## Tarefas da equipe

1. Encontrar um atendimento e identificar a situação, o responsável e eventual prazo vencido.
2. Atribuir um responsável e registrar a revisão administrativa sem confundir com início do atendimento clínico.
3. Explicar o efeito de solicitar reagendamento e de cancelar uma vaga.
4. Como coordenação, definir responsável/prazo da unidade e identificar limitações do perfil de acesso.

## Teclado, leitor de tela e ampliação

- Usar Tab/Shift+Tab, Enter e Escape: link de pular conteúdo, menu móvel, formulários, erros e ações do histórico.
- Com NVDA/Firefox, VoiceOver/Safari ou TalkBack/Chrome conforme disponibilidade real, conferir nomes dos campos, títulos, ordem de leitura, situação e anúncio de erros. Registrar a combinação exata de sistema/navegador/leitor e a experiência prévia da pessoa.
- Ampliar texto e zoom; testar tela estreita e orientação de celular. Conferir foco visível, ausência de sobreposição e necessidade de rolagem horizontal.
- Observar contraste e uso sem depender só de cor. Conferir o formulário quando há falha de rede, sessão expirada e vaga ocupada por outra pessoa.

## Registro por sessão

| Campo | Preencher após a sessão |
| --- | --- |
| Código / data / facilitador | Pendente |
| Dispositivo, navegador e tecnologia assistiva | Pendente |
| Tarefa | Pendente |
| Concluiu sozinho, com ajuda ou não concluiu | Pendente |
| Dificuldade e trecho de interface relacionado | Pendente |
| Tempo, pedidos de ajuda e erros observados | Pendente |
| Próximo passo entendido pela pessoa | Pendente |
| Ação corretiva, responsável e prazo | Pendente |

Corrigir barreiras que impeçam completar tarefas e repetir as tarefas afetadas. Não preencher resultados com personas ou simulações como se fossem observações reais. A aprovação para uso institucional deve considerar os achados e as pendências ainda abertas.

Referências: [W3C WAI — avaliação com usuários](https://www.w3.org/WAI/test-evaluate/involving-users/) e [Playwright — testes automatizados de acessibilidade](https://playwright.dev/docs/accessibility-testing). Ferramentas automatizadas não substituem avaliação humana nem certificam, sozinhas, conformidade integral com WCAG.
