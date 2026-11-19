# Segurança e dados

## Controles implementados

- Senhas com scrypt, salt individual e comparação de hash em tempo constante. Mínimo 12 e máximo 128 caracteres. Cinco falhas consecutivas bloqueiam a conta por 15 minutos; limitação adicional de requisições por IP é mantida no PostgreSQL e compartilhada entre instâncias.
- Sessão aleatória de 256 bits: só seu SHA-256 fica no banco. Cookie HttpOnly, SameSite=Strict e Secure com HTTPS. Duração absoluta de 8 horas e inatividade de 30 minutos. Logout e alteração de senha revogam sessões. Desativação da conta bloqueia todas as sessões.
- Proteção de mutações por origem permitida e token CSRF vinculado à sessão. Perfis são revalidados no servidor em cada requisição. Sem JWT ou dados pessoais no localStorage. Chaves antigas `sf_paciente`, `sf_triagem` e `sf_agendamentos` são removidas ao abrir a nova interface.
- Perfis: paciente só acessa os próprios registros; recepção, enfermagem e coordenação acessam a unidade atribuída; administração gerencia todas. Apenas enfermagem e administração recebem o motivo clínico autorrelatado. Observação administrativa é visível também ao paciente e não deve conter dados clínicos.
- Perfil pessoal, motivo, observações, evidência clínica e detalhes de auditoria cifrados com AES-256-GCM, IV aleatório e contexto autenticado. Busca de e-mail/CPF usa HMAC com chave independente. Nomes usam índice de prefixos HMAC: ele revela padrões de igualdade/comprimento e não substitui controle de acesso.
- Auditoria transacional de alterações, registro de consultas, autenticação, concessão/desativação de contas, validações e retenção. Trigger PostgreSQL rejeita UPDATE/DELETE nos eventos. Essa proteção não torna o histórico inviolável por um administrador do próprio banco.
- Logs JSON sem corpos de requisição, sintomas, CPF, cookies, senhas ou parâmetros da URL. Resposta com identificador de requisição e erro sem stack/SQL. Endpoints de métricas e auditoria são exclusivos da administração. Saúde não expõe dados internos.
- Cabeçalhos de segurança e CSP sem scripts inline, limite de corpo JSON de 16 KB, CORS explícito e HTTPS obrigatório em `NODE_ENV=production`. O servidor escuta apenas em loopback. Não confia em cabeçalhos de proxy para identificar IPs.

## Segredos

`DATA_ENCRYPTION_KEY` e `LOOKUP_HMAC_KEY`: duas chaves diferentes, aleatórias, de 32 bytes em hexadecimal. `.env` e artefatos gerados são ignorados pelo Git. Nunca imprimir chaves ou senhas nos logs. A aplicação rejeita configuração ausente/inválida e HTTP em produção.

Não trocar essas chaves diretamente em uma instalação com dados. A perda da chave de criptografia impede recuperar os dados. A troca da chave de busca exige recalcular índices. A rotação deve ser uma migração controlada com guarda e revisão da instituição; não foi implementada uma rotação automática.

O bootstrap cria apenas o primeiro administrador e se recusa a alterar contas existentes. Não há senha padrão. Administrador cria contas individuais de recepção, enfermagem e coordenação depois de conferir vínculo e qualificação. Conferência de identidade é presencial; não existe confirmação automática de e-mail nesta etapa. Recuperação de conta e uma política de autenticação forte com MFA precisam de definição institucional antes de exposição ampla.

## Retenção

Nenhum prazo legal foi inventado. Sem `RETENTION_DAYS` e `RETENTION_POLICY_REFERENCE`, a operação é bloqueada. Após aprovação institucional, a administração consulta `GET /api/operations/retention` e executa `POST /api/operations/retention` enviando `{ "policyReference": "referência configurada" }`.

Cada execução remove motivo e observação de até 100 agendamentos cancelados/concluídos cuja última alteração anteceda o prazo, mantendo identificador, estado, horário, vínculo e auditoria. É irreversível para esses campos no banco ativo; cópias anteriores podem continuar em backups. Não executamos retenção no banco do usuário.

O escopo atual da rotina é **texto suplementar dos agendamentos**, não toda a retenção institucional. Exclusão/anonimização de contas, arquivo legado, auditoria e backups precisa de política própria e aprovação do controlador. Sessões e contadores de requisição expirados são removidos periodicamente, sem depender da política clínica. Não há expurgo automático de prontuário.

## Limites que exigem decisão externa

Os controles acima não constituem certificação jurídica ou de segurança. A instituição ainda precisa definir responsável pelos dados, fundamento e finalidade do tratamento, aviso de privacidade, atendimento aos titulares e prazos de cada categoria. Não há integração oficial com SUS, revisão clínica efetivamente realizada ou cadastro de unidades validado por nós. Não foi feito deploy; infraestrutura, backup/restauração e notificações foram adiados pelo usuário.
