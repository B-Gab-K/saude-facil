# Infraestrutura e ambientes

| Arquivo ou pasta | Finalidade |
| --- | --- |
| `compose.yaml` | Banco e aplicação da instalação Compose |
| `compose.secure.yaml` | TLS e ajustes de homologação/produção em servidor próprio |
| `compose.capture.yaml` | Captura de e-mail em desenvolvimento |
| `compose.demo.yaml` | Ambiente acadêmico local isolado |
| `config/*.env.example` | Modelos versionados de configuração |
| `config/*.env` | Configurações locais privadas, fora do Git |
| `secrets/` | Credenciais, chaves e arquivos de acessos locais, fora do Git |
| `container-entrypoint.sh` | Migrações e inicialização no fluxo Compose |
| `start-hosted.sh` | Inicialização da hospedagem atual no Render |
| `healthcheck.cjs` | Verificação de saúde do container |
| `systemd/` | Modelos para executar backups periódicos em servidor próprio |

O [guia de hospedagem](../docs/HOSPEDAGEM.md) descreve o serviço publicado no Render. O [guia de operação](../docs/OPERACAO_E_DEPLOY.md) detalha Compose, TLS, backup e restauração.

O arquivo privado principal de acessos é `secrets/ACESSOS.txt`. O arquivo `secrets/demo/ACESSOS.txt` pertence somente ao banco local. Consulte [acessos](../docs/ACESSOS.md).

Cada ambiente tem banco, volume e chaves próprios. Os inicializadores recusam sobrescrever instalações existentes. Preserve os arquivos originais de chaves e a separação entre os ambientes ao reorganizar ou copiar o projeto.
