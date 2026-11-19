# Arquitetura e regras de agendamento

O sistema reserva uma vaga administrada pela instituição. Não há sincronização com e-SUS, SISREG, CNES ou outros sistemas externos. Só publicar vagas que a unidade efetivamente reconheça e mantenha neste sistema.

## Responsabilidades e SOLID

- `auth/`: autenticação, sessões, contas, conferência de identidade e autorização por perfil.
- `catalog/`: dados institucionais, publicação de unidades e serviços e disponibilidade dos recursos.
- `appointments/`: casos de uso de reserva, consulta, cancelamento e reagendamento. `AppointmentPolicy` concentra transições e escopo; `AppointmentsStore` define o contrato de persistência e `AppointmentsRepository` implementa Prisma/transações. O contrato transacional expõe o cliente Prisma como unidade de trabalho, uma dependência de infraestrutura explicitamente mantida nesta versão.
- `platform/`: configuração validada, criptografia, auditoria e HTTP. Cada serviço tem responsabilidade separada; o arquivamento legado e a expiração de sessões são serviços próprios.
- `guidance/`: conteúdo educativo versionado, fontes, registro, validade e revogação de revisão profissional. Nenhuma classificação de risco automatizada.
- `operations/`: saúde, métricas, leitura de auditoria e execução da política de retenção configurada.

A injeção de dependências do NestJS permite substituir o repositório e os serviços sem alterar controladores. DTOs aceitam apenas campos declarados. Não há endpoint que transforme cadastro público em perfil profissional ou administrativo.

## Reserva

1. Administrador cadastra uma unidade. Administração/coordenação registra confirmação institucional, endereço e fonte antes da publicação.
2. Serviço permanece em rascunho até validação de sua oferta. A lista pública não oferece serviços de exemplo.
3. Administração/coordenação cadastra horários com início/fim e fuso explícito. Um código estável identifica cada profissional/recurso em todos os serviços da unidade.
4. O paciente cria conta, entra e tem sua identidade conferida presencialmente pela equipe autorizada da unidade escolhida. O sistema registra quem conferiu e a referência do procedimento. Isso não consulta a Receita Federal ou o CNS, nem verifica automaticamente a propriedade do e-mail.
5. A reserva consulta o banco novamente dentro de transação SERIALIZABLE. A identidade vem da sessão, nunca de CPF ou `patientId` enviado pelo navegador.
6. Índice parcial exclusivo impede duas reservas não canceladas na mesma vaga. Constraint de exclusão impede sobreposição de slots do mesmo recurso, inclusive em serviços diferentes. A trava por paciente e a transação também impedem reservas simultâneas em intervalos conflitantes para a mesma pessoa.
7. Cancelamento libera a vaga. Reagendamento valida a nova vaga e troca a reserva em uma única transação; falha preserva a reserva anterior. Só é permitido manter unidade e serviço. Alterações usam `version` para rejeitar telas desatualizadas.

Usar o mesmo código de recurso é uma obrigação do cadastro: códigos diferentes para a mesma pessoa não podem ser reconhecidos automaticamente como o mesmo profissional. Nesta versão, uma vaga tem capacidade de um paciente. O fuso institucional é `America/Cuiaba`.

## Estados

| Estado atual | Próximos estados |
| --- | --- |
| CONFIRMED | IN_REVIEW, RESCHEDULE_REQUESTED, CANCELLED |
| IN_REVIEW | COMPLETED, RESCHEDULE_REQUESTED, CANCELLED |
| RESCHEDULE_REQUESTED | CONFIRMED por reagendamento, CANCELLED |
| COMPLETED / CANCELLED | Nenhum |

A finalização exige enfermagem ou administração e não pode anteceder o início do atendimento. Paciente pode cancelar/reagendar os próprios atendimentos futuros. Após o início, contata a unidade. Status concluído não permite inserir diagnóstico: o sistema não é prontuário clínico.

## Consultas

`GET /api/solicitacoes` retorna `{items,total,page,limit}`. Aceita `status`, `unitId`, `serviceId`, `from`, `to`, `q`, `sort=createdAt|startsAt`, `order=asc|desc`. Limite máximo: 100, padrão: 20. Ordenação desempata por ID. Busca por nome usa prefixos de palavras a partir de três caracteres em índice HMAC; não faz busca livre dentro do texto clínico. O escopo da sessão é aplicado junto de qualquer filtro.

Reservas encerradas não são apagadas por botão do paciente. Solicitações legadas ficam em tabela separada, cifradas na inicialização e indisponíveis pelos endpoints normais. Não são promovidas a reservas oficiais.
