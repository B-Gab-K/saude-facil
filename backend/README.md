# API Saúde Fácil

API NestJS com TypeScript, Prisma e PostgreSQL 16. O mesmo processo serve as páginas de `frontend/` e os endpoints sob `/api`.

## Organização

| Diretório | Responsabilidade |
| --- | --- |
| `src/auth/` | Contas, sessões, permissões e identificação |
| `src/catalog/` | Unidades, serviços e disponibilidade |
| `src/appointments/` | Agendamento, histórico e transições de estado |
| `src/guidance/` | Orientações de saúde e revisão profissional |
| `src/notifications/` | Consentimento, outbox e transporte de e-mail |
| `src/operations/` | Saúde, métricas, auditoria e retenção |
| `src/platform/` | Configuração, criptografia, HTTP e serviços compartilhados |
| `src/prisma/` | Conexão com o banco |
| `src/cli/` | Bootstrap administrativo e preparação do ambiente acadêmico |
| `prisma/` | Schema e migrações versionadas |
| `test/` | Testes unitários, integração, navegador e suporte |

`dist/`, `generated/` e `node_modules/` são gerados e não são versionados. `package-lock.json` fixa as dependências da API e deve acompanhar mudanças em `package.json`.

Use os [comandos da raiz](../README.md#comandos-na-raiz) ou os scripts equivalentes deste diretório. A instalação, as variáveis e os requisitos dos testes estão no [guia de desenvolvimento](../docs/DESENVOLVIMENTO.md). As regras transacionais estão em [arquitetura](../docs/ARQUITETURA.md).
