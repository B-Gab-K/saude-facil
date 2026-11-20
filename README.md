# Saúde Fácil

Portal de agendamento e acompanhamento de atendimentos, com área do paciente, agenda profissional e gestão de unidades e serviços.

**Aplicação:** [saude-facil-demo-hhyy.onrender.com](https://saude-facil-demo-hhyy.onrender.com) · **Stack:** HTML/CSS/JavaScript, NestJS, Prisma e PostgreSQL 16.

## Começar

Requisitos: Node.js 22.9 ou superior, npm e PostgreSQL 16. Docker é opcional para executar o banco e os ambientes completos.

```bash
npm run setup
cp backend/.env.example backend/.env
```

Configure a conexão e as duas chaves independentes em `backend/.env`, conforme o [guia de desenvolvimento](docs/DESENVOLVIMENTO.md). Depois:

```bash
npm run db:migrate
npm run build
npm start
```

O ambiente local abre em **http://localhost:3001**. O [guia completo](docs/DESENVOLVIMENTO.md) inclui banco de desenvolvimento, criação do primeiro administrador e preparação dos testes. Para editar e executar com TypeScript, use `npm run dev`.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| [frontend/](frontend/README.md) | Páginas, navegação, estilos e interação com a API |
| [backend/](backend/README.md) | API, regras de negócio, persistência e testes |
| [deploy/](deploy/README.md) | Docker Compose, configurações por ambiente e inicialização |
| [scripts/](scripts/README.md) | Ferramentas de operação, implantação e backup |
| [docs/](docs/README.md) | Guias atuais e histórico separado por contexto |
| [render.yaml](render.yaml) | Infraestrutura da aplicação e do PostgreSQL no Render |
| [.github/workflows/](.github/workflows/) | Validação automática e implantação alternativa por SSH |

## Comandos na raiz

| Comando | Finalidade |
| --- | --- |
| `npm run setup` | Instalar as dependências da API e gerar o cliente Prisma |
| `npm run dev` | Executar a aplicação local a partir do TypeScript |
| `npm run build` | Compilar a API |
| `npm start` | Executar a API compilada e servir o frontend |
| `npm run db:generate` | Gerar o cliente Prisma após mudanças no schema |
| `npm run db:migrate` | Aplicar as migrações ao banco configurado |
| `npm run admin:bootstrap` | Criar o primeiro administrador com as variáveis fornecidas |
| `npm test` | Compilar e executar os testes unitários |
| `npm run test:integration` | Executar integração em banco exclusivo de testes |
| `npm run test:e2e` | Executar os testes de navegador e acessibilidade |
| `npm run test:backup` | Verificar backup e restauração em banco descartável |

Integração e navegador exigem `TEST_DATABASE_URL` com nome de banco terminado em `_test`. Consulte os requisitos de cada suíte no [guia de desenvolvimento](docs/DESENVOLVIMENTO.md#testes).

## Hospedagem e acessos

A aplicação e o banco estão no Render e funcionam com o computador local desligado. O banco gratuito atual expira em **20/12/2026**; estado, atualização e limites estão no [guia de hospedagem](docs/HOSPEDAGEM.md).

O arquivo privado **`deploy/secrets/ACESSOS.txt`** reúne os acessos conferidos do site publicado. Os acessos do ambiente local ficam em `deploy/secrets/demo/ACESSOS.txt`. Ambos ficam fora do Git. Consulte o [guia de acessos](docs/ACESSOS.md) para os perfis e a manutenção desses arquivos.

## Documentação técnica

- [Arquitetura e regras de agendamento](docs/ARQUITETURA.md)
- [Segurança e proteção dos dados](docs/SEGURANCA_E_DADOS.md)
- [Operação, ambientes e backup](docs/OPERACAO_E_DEPLOY.md)
- [Validação institucional](docs/VALIDACAO_INSTITUCIONAL.md)
- [Roteiro de usabilidade](docs/TESTES_DE_USABILIDADE.md)
- [Documentação histórica](docs/historico/README.md)

O ambiente acadêmico é separado de uma eventual operação institucional. A agenda não sincroniza com sistemas externos do SUS, e as orientações de saúde não realizam diagnóstico ou triagem automatizada. Os requisitos de liberação estão registrados no guia de validação.
