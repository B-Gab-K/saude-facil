# Saúde Fácil

Portal de agendamento com interface HTML/JavaScript, API NestJS e PostgreSQL/Prisma. A reserva ocupa uma vaga real **da agenda cadastrada e validada pela instituição neste sistema**; não há sincronização com agendas externas do SUS.

Contas individuais, permissões por perfil/unidade, identidade conferida presencialmente, sessões HttpOnly, dados pessoais e de saúde cifrados, auditoria e reserva transacional. A orientação é educativa e não realiza diagnóstico nem triagem automatizada.

O código está preparado para validação institucional. Ainda faltam dados oficiais de oferta/horários, aprovação dos responsáveis e políticas institucionais: veja [pendências e fontes](docs/VALIDACAO_INSTITUCIONAL.md). Para avaliação local, use dados inventados até essa liberação.

A [demonstração pública](https://saude-facil-demo-hhyy.onrender.com) foi publicada no Render em 20/11/2026, com aplicação e PostgreSQL gratuitos, migrações e dados fictícios na inicialização. O ambiente de demonstração é separado da operação institucional. A interface usa a apresentação padrão do portal, sem faixas acadêmicas ou rótulos de dados fictícios; a identificação do ambiente permanece na configuração e na documentação técnica. A [documentação de hospedagem](docs/HOSPEDAGEM_DEMONSTRACAO.md) registra a verificação e os limites do plano gratuito, incluindo a expiração do banco em 20/12/2026.

## Estrutura

- [frontend/](frontend/): telas, estilos e scripts; sem dados pessoais persistidos no navegador.
- [backend/](backend/): módulos da API, Prisma, migrações e testes.
- [docs/](docs/): arquitetura, segurança, validação e documentos históricos.

Leia [arquitetura e regras](docs/ARQUITETURA.md) e [segurança e dados](docs/SEGURANCA_E_DADOS.md). Os demais roteiros anteriores em `docs/` descrevem o protótipo antigo e não substituem esses documentos.

[Operação e deploy](docs/OPERACAO_E_DEPLOY.md) descreve os ambientes separados, CI/CD, backup/recuperação, atribuições/prazos e e-mail com consentimento. O [roteiro de usabilidade](docs/TESTES_DE_USABILIDADE.md) está pronto para aplicação com participantes externos.

## Executar localmente

Requisitos: Node.js 22.9+, npm e PostgreSQL 16. Docker pode fornecer o banco. Não reutilize credenciais de desenvolvimento em ambiente operacional.

```bash
docker run --name saude-facil-dev-db -e POSTGRES_USER=saude -e POSTGRES_PASSWORD=saude -e POSTGRES_DB=saude_facil -p 127.0.0.1:55432:5432 -d postgres:16-alpine
cd backend
npm ci
cp .env.example .env
```

Gere duas chaves diferentes com o comando abaixo, uma por execução, e configure `DATA_ENCRYPTION_KEY` e `LOOKUP_HMAC_KEY` no arquivo local `.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Confira `DATABASE_URL` e execute:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run build
```

Crie o primeiro administrador com credenciais próprias, usando variáveis de ambiente. A senha não possui valor padrão. Exemplo com prompt sem eco para não deixar a senha no histórico do shell:

```bash
read -r -p 'E-mail administrativo: ' ADMIN_EMAIL
read -r -p 'Nome: ' ADMIN_NAME
read -r -s -p 'Senha (12 a 128 caracteres): ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD
npm run admin:bootstrap
unset ADMIN_PASSWORD ADMIN_EMAIL ADMIN_NAME
npm start
```

Abra **http://localhost:3001**. A própria API serve o frontend, sem precisar de um servidor estático separado. O backend continua escutando apenas em loopback. Opcionalmente, o frontend pode ser servido na porta 8000, no mesmo hostname e nas origens configuradas.

Ao iniciar após as migrações, dados de demonstração antigos são cifrados e preservados em arquivo legado separado das reservas. Eles não são atribuídos a pacientes reais ou convertidos em horários confirmados. Guarde as chaves: perdê-las impede recuperar esses dados.

## Configurar a instituição

1. Entre como administrador em “Área profissional” e abra a gestão.
2. Cadastre unidades com endereço e fonte institucional. Registre a referência de validação para publicar.
3. Cadastre e valide serviços; publique horários com fuso explícito e um código estável por profissional/recurso.
4. Crie acessos individuais de recepção, enfermagem e coordenação, vinculados à unidade.
5. Pacientes criam conta com nome, e-mail e senha. CPF, nascimento e unidade são preenchidos na etapa posterior de identificação. Após conferência presencial, podem reservar, cancelar e reagendar os próprios horários.
6. O responsável clínico autorizado pode registrar revisão da orientação educativa em sua tela. A data da revisão aparece nas orientações quando há uma revisão válida registrada.

Produção exige `NODE_ENV=production` e origens HTTPS. No modo TLS direto, também exige `TLS_CERT_PATH`/`TLS_KEY_PATH`; plataformas com HTTPS no proxy podem usar explicitamente `TLS_TERMINATION=proxy`, com porta HTTP interna isolada e cookies seguros preservados. Retenção de textos suplementares só é executável com prazo e referência aprovados configurados, conforme [escopo da política](docs/SEGURANCA_E_DADOS.md). A infraestrutura está preparada e testável localmente; publicação externa e envios reais continuam dependendo de acessos autorizados. Nenhum envio real é habilitado por padrão.

## Testes

```bash
cd backend
npm run test:unit
```

Para integração, use exclusivamente um banco de testes com nome terminado em `_test`, por exemplo:

```bash
docker run --name saude-facil-test-db -e POSTGRES_USER=saude_test -e POSTGRES_PASSWORD=local_test_only -e POSTGRES_DB=saude_facil_test -p 127.0.0.1:55433:5432 -d postgres:16-alpine
export TEST_DATABASE_URL='postgresql://saude_test:local_test_only@127.0.0.1:55433/saude_facil_test?schema=public'
npm run test:integration
```

A suíte cria seu próprio schema temporário, aplica migrações e remove apenas esse schema ao concluir. Não aponta para o banco operacional. Valida autenticação, escopo, CSRF, criptografia, auditoria, limites, transições e reservas concorrentes com PostgreSQL real.

Para os testes de navegador e acessibilidade automatizada:

```bash
cd backend
npx playwright install --with-deps chromium
npm run test:e2e
```

O `TEST_DATABASE_URL` também é necessário nesse caso. O servidor de teste cria seu próprio schema e o remove ao encerrar. Os testes incluem cadastro progressivo, reserva/reagendamento/cancelamento, falha de rede, teclado, axe e reflow em 320/1280 pixels. Não equivalem a testes com usuários ou leitor de tela real.

O teste de backup usa um container PostgreSQL **descartável** com permissão de criar bancos temporários:

```bash
BACKUP_TEST_CONTAINER=saude-facil-test-db BACKUP_TEST_USER=saude_test npm run test:backup
```
