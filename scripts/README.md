# Ferramentas de operação

Execute os comandos a partir da raiz do repositório. O [package.json principal](../package.json) fornece os atalhos de desenvolvimento e testes; estes scripts atendem à infraestrutura.

| Script | Uso |
| --- | --- |
| `init-environment.mjs` | Criar configuração e segredos de `development`, `staging` ou `production` |
| `stack.mjs` | Executar Docker Compose no ambiente escolhido |
| `prepare-demo.mjs` | Preparar o ambiente acadêmico local, com credenciais próprias |
| `backup-stack.mjs` | Criar backup cifrado de um ambiente Compose |
| `db-backup.mjs` | Executar backup e restauração com os parâmetros e chaves fornecidos |
| `deploy.mjs` | Implantar uma imagem imutável em servidor próprio, com backup prévio |

Exemplo de execução em desenvolvimento, com a imagem local já construída:

```bash
node scripts/init-environment.mjs development
node scripts/stack.mjs development up -d --wait app
```

As opções completas e os pré-requisitos de backup/TLS estão em [operação e implantação](../docs/OPERACAO_E_DEPLOY.md). A publicação atual no Render é descrita separadamente em [hospedagem](../docs/HOSPEDAGEM.md).
