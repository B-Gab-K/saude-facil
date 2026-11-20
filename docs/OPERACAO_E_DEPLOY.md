# Operação e implantação

Este guia descreve os ambientes Docker Compose e a implantação em servidor próprio. O ambiente público atual está no Render, com aplicação e PostgreSQL independentes do computador local: consulte [hospedagem atual](HOSPEDAGEM.md). O workflow SSH/GHCR abaixo é uma alternativa preparada, sem host de destino configurado. Dados oficiais, domínio próprio, política institucional e provedor SMTP dependem dos responsáveis.

## Ambientes separados

Cada ambiente usa um projeto Docker Compose próprio (`saude-facil-development`, `saude-facil-staging`, `saude-facil-production`), volume PostgreSQL, rede, credenciais, chaves de criptografia e backup independentes. Não copie dados pessoais de produção para desenvolvimento ou homologação. Não reutilize chaves entre os ambientes.

Requisitos: Node.js 22.9+, Docker Engine e Docker Compose v2+ com `--wait`, além de certificado e chave TLS para homologação/produção. A aplicação escuta em todas as interfaces **dentro** do container; a publicação no host continua restrita a `127.0.0.1` por padrão. Exposição pública exige configurar explicitamente rede/firewall, domínio e certificado válido.

Na raiz do repositório:

```bash
docker build -f backend/Dockerfile -t saude-facil:local .
node scripts/init-environment.mjs development
node scripts/stack.mjs development up -d --wait app
```

Abra `http://localhost:3001`. O inicializador grava configuração e segredos locais ignorados pelo Git, com acesso restrito ao proprietário. Recusa sobrescrever uma configuração já criada. O UID/GID do usuário do container acompanha o proprietário dos segredos no host. Não mude as chaves de uma instalação existente sem migração planejada.

Para homologação, com certificados já provisionados:

```bash
node scripts/init-environment.mjs staging https://homologacao.seu-dominio /caminho/cert.pem /caminho/key.pem
node scripts/stack.mjs staging up -d --wait app
```

Produção usa `production` e seu domínio/certificado em lugar de `staging`. Certificados autoassinados podem ser usados apenas em testes locais controlados; eles não demonstram configuração pública válida.

Depois da criação do banco, crie o primeiro administrador, sem senha no histórico:

```bash
read -r -p 'E-mail administrativo: ' ADMIN_EMAIL
read -r -p 'Nome: ' ADMIN_NAME
read -r -s -p 'Senha: ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD
node scripts/stack.mjs development run --rm -e ADMIN_EMAIL -e ADMIN_NAME -e ADMIN_PASSWORD app node dist/cli/bootstrap-admin.js
unset ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD
```

O primeiro administrador cadastra/valida a instituição, os serviços, a equipe e as vagas. Esse procedimento não atribui aprovação institucional automaticamente.

## CI e releases

O [workflow de validação](../.github/workflows/ci.yml) executa testes unitários, integração PostgreSQL, navegador/axe, build da imagem, inicialização com migrações, backup cifrado e teste de restauração. As ações externas estão identificadas por SHA. Dados de teste ficam em schemas/bancos e volumes descartáveis.

O [workflow de implantação](../.github/workflows/deploy.yml) é acionado manualmente para `staging` ou `production`, a partir da `main`. Reexecuta a validação, publica uma imagem no GHCR e implanta seu digest SHA-256 imutável. O script remoto faz backup antes das migrações e aguarda a aplicação saudável. Falha de migração interrompe a troca; falha de saúde é reportada e não dispara restauração automática do banco.

Para ativar o workflow, um administrador precisa configurar os GitHub Environments `staging` e `production`, restrição de branch e revisores obrigatórios de produção. Em cada ambiente, cadastrar `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` e `DEPLOY_KNOWN_HOSTS` (chave do servidor conferida fora do canal SSH). Nunca desabilitar a verificação da chave do host. O usuário remoto precisa ter acesso somente à instalação acordada e autorização para Docker; acesso ao Docker equivale a privilégios administrativos no host.

O host deve ter Node, Compose, diretório `/opt/saude-facil` preparado, configurações/segredos provisionados e autenticação de leitura no GHCR quando a imagem for privada. O workflow não transmite chaves de dados, senhas do banco ou arquivos `.env` junto do código. Os acessos SSH e os segredos dos GitHub Environments para esse fluxo não estão configurados. A publicação existente no Render usa o repositório Git e um fluxo separado, descrito no guia de hospedagem.

## Backup e recuperação

```bash
node scripts/backup-stack.mjs staging /var/backups/saude-facil/staging
```

O backup usa o cliente PostgreSQL da mesma versão do servidor, dentro do container. `pg_dump` em formato customizado é cifrado em fluxo com AES-256-GCM e chave própria. O arquivo final é criado sem sobrescrever um arquivo existente, com manifesto SHA-256 e identificação da chave. Arquivos parciais são removidos em caso de erro. Não é backup físico/PITR e não cobre arquivos de configuração, certificados ou chaves.

Guarde cópia cifrada fora do host conforme a política aprovada, monitore falhas e teste a recuperação periodicamente. Preserve separadamente as chaves `data_key`, `lookup_key` e `backup_key` em cofre institucional: restaurar o PostgreSQL sem as chaves originais não permite recuperar os dados da aplicação. Não foi configurada cópia externa sem destino e credenciais.

As unidades [service](../deploy/systemd/saude-facil-backup@.service) e [timer](../deploy/systemd/saude-facil-backup@.timer) fornecem agendamento diário, com recuperação de execução perdida. Devem ser instaladas no host aprovado, com usuário de serviço, acesso ao Docker e diretórios de backup protegidos. Não foram instaladas automaticamente no computador do usuário. O prazo de retenção e a remoção de backups dependem da política institucional; não apagamos backups por idade sem essa definição.

Para restaurar, prepare **outro banco vazio** e um cliente PostgreSQL compatível. Configure `DATABASE_URL_FILE` com a conexão de recuperação e `BACKUP_ENCRYPTION_KEY_FILE` com a chave correspondente:

```bash
node scripts/db-backup.mjs restore --input /backup/arquivo.sfb --confirm-database nome_exato_do_banco_vazio
```

Se o banco estiver em container, acrescente `--container identificador_do_container`. A conexão nesse modo é local ao PostgreSQL do container. A ferramenta autentica o dump inteiro em arquivo temporário protegido **antes** de abrir a restauração. Recusa banco com tabelas e executa `pg_restore` em transação única. Arquivo adulterado ou chave incorreta não grava no destino. O teste automatizado confere a recuperação de dados pessoais cifrados com sua chave original.

Em incidente: interrompa novas gravações, preserve evidências e o banco atual, recupere em banco isolado, confira migrações/dados/chaves e só então faça a troca de conexão e o teste de saúde. Retornar somente a imagem anterior não reverte migrações: valide compatibilidade de schema antes de rollback. Não use `down --volumes` em uma instalação com dados que devem ser preservados.

## Responsabilidade e prazos

Na gestão, a administração/coordenação escolhe uma pessoa ativa da equipe da unidade e o prazo da primeira revisão administrativa, entre 15 e 10080 minutos **corridos**. Não há prazo institucional inventado por padrão. Novas reservas e reagendamentos recebem uma atribuição e um vencimento; a confirmação do horário não depende dessa revisão. Alterações da regra não reescrevem prazos antigos.

A equipe pode atribuir um atendimento e registrar a revisão. A agenda indica prazo vencido; métricas administrativas incluem revisões vencidas/sem responsável e notificações pendentes/falhas. Cabe à instituição definir escala, substituições, telefone de contato e procedimento de acompanhamento. O contador administrativo não é tempo de espera clínica ou classificação de urgência.

## Notificações e consentimento

Há integração por **e-mail SMTP**; SMS não foi escolhido nem configurado. Por padrão `NOTIFICATION_MODE=disabled`. Para teste local, `node scripts/stack.mjs development --capture up -d --wait app mailpit` acrescenta Mailpit, cuja caixa de entrada é acessível só em `http://localhost:8025`. Não encaminhe essa caixa para a internet nem use dados reais.

Para SMTP real, configurar `NOTIFICATION_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_FROM` e o segredo `SMTP_PASSWORD_FILE`. TLS é obrigatório. Homologação exige `NOTIFICATION_ALLOWLIST`, com endereços de teste explícitos. A instituição deve validar domínio remetente, provedor e política de comunicação antes de ativar o envio.

Na Minha conta, a pessoa opta por receber avisos e confirma um código enviado ao e-mail de cadastro. O código é de uso único, expira em 24 horas e tem limite de reenvio. Os avisos de agenda só entram na fila após consentimento e confirmação do endereço. Cancelar o consentimento invalida confirmações e cancela mensagens ainda pendentes; uma mensagem já entregue ao SMTP pode continuar em trânsito.

A fila transacional é gravada junto da alteração do agendamento. Workers usam lease, exclusão entre concorrentes, até cinco tentativas e recuo exponencial. A entrega é pelo menos uma vez: falha entre aceitação SMTP e gravação do resultado pode gerar repetição; Message-ID estável reduz ambiguidade, mas não garante deduplicação pelo destinatário. Não enviamos sintomas, nomes, especialidade, unidade, datas de consulta ou texto clínico; a mensagem pede acesso autenticado ao portal. Logs não mostram destinatários, códigos ou conteúdo.
