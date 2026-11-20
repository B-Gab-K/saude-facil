# Hospedagem atual

Referência da configuração em 20/11/2026. O registro das implantações anteriores está em [histórico de hospedagem](historico/HOSPEDAGEM_DEMONSTRACAO.md).

## Ambiente publicado

| Item | Configuração |
| --- | --- |
| Endereço público | https://saude-facil-demo-hhyy.onrender.com |
| Plataforma / workspace | Render / My Workspace |
| Aplicação | `saude-facil-demo-hhyy` — Docker, plano Free |
| Banco | `saude-facil-demo-db-hhyy` — PostgreSQL 16, plano Free |
| Região | Virginia, aplicação e banco na mesma região |
| Repositório / branch | `B-Gab-K/saude-facil` / `main` |
| Implantação automática | Desativada; a publicação é acionada manualmente |
| Saúde | `GET /api/operations/health` |
| Notificações | Desativadas neste ambiente |
| Expiração do banco | 20/12/2026, às 14h15 (America/Cuiaba) |

A aplicação e o banco executam nos servidores do Render. O computador do desenvolvedor pode permanecer desligado. O antigo túnel Cloudflare era um ambiente local separado e não é o endereço principal.

O serviço web gratuito suspende após 15 minutos sem tráfego e pode levar cerca de um minuto para responder no próximo acesso. O PostgreSQL gratuito expira após 30 dias e não tem backup gerenciado. Referência: [limites dos serviços gratuitos do Render](https://render.com/docs/free). Antes da expiração, planeje a continuidade do banco e a guarda dos dados e das chaves.

## Atualizar a aplicação

1. Revise as alterações e execute as verificações adequadas. O CI do repositório valida compilação, integração, navegador, imagem Docker e recuperação de backup.
2. Envie a versão revisada para `main`.
3. No serviço existente do Render, use **Manual Deploy → Deploy latest commit**. Alterações apenas na documentação não precisam de implantação.
4. Acompanhe a implantação até o estado `live` e confira o commit publicado.
5. Verifique o endpoint de saúde e o comportamento alterado no endereço público. Um pedido de implantação aceito ainda não significa que a versão está no ar.

O [Blueprint](../render.yaml) descreve os recursos. Para atualizar somente o código, reutilize o serviço existente; não é necessário criar outro banco ou aplicar novamente o Blueprint.

Na inicialização, o processo aplica as migrações e executa o seed restrito ao ambiente acadêmico isolado. A execução repetida preserva contas, senhas e reservas, acrescentando horários ainda não cadastrados para os próximos sete dias. A atualização dos rótulos originais preserva nomes personalizados. As contas já existentes só têm senhas redefinidas mediante a operação explícita descrita no histórico.

## Credenciais e configurações

Os acessos conferidos do site ficam em `deploy/secrets/ACESSOS.txt`, fora do Git. Os acessos do ambiente local ficam em arquivo separado. Consulte [acessos e perfis](ACESSOS.md).

A conexão de banco e as chaves da instalação publicada pertencem ao ambiente do Render. Os arquivos em `deploy/secrets/development`, `staging` e `demo` são locais e não devem substituir as chaves do site existente. O acesso externo direto ao banco publicado está bloqueado; a aplicação usa a rede interna.

O fluxo SSH/GHCR de [operação e implantação](OPERACAO_E_DEPLOY.md) é uma alternativa para servidor próprio. Ele não é o mecanismo utilizado pelo site atual no Render.
