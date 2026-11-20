# Hospedagem da demonstração acadêmica

Preparação em 20/11/2026. O arquivo `render.yaml` provisiona uma demonstração separada: aplicação Docker e PostgreSQL 16, ambos no plano gratuito explícito. Não provisiona uma operação institucional. Os dados são fictícios, as notificações ficam desativadas e todas as páginas exibem o aviso de demonstração.

Estado desta sessão: demonstração local isolada ativa em https://dates-paragraphs-systematic-cfr.trycloudflare.com, verificada por navegador automatizado em 20/11/2026. Esse link é temporário e depende do computador e do container `saude-facil-demo-tunnel`. Nenhum serviço Render foi criado. As credenciais locais estão em `deploy/secrets/demo/ACESSOS.txt`, fora do Git.

## Render

1. Enviar a versão atual do projeto, incluindo `render.yaml`, para a branch que será publicada. A presença local desses arquivos não atualiza o GitHub.
2. Autorizar uma conta Render e o acesso ao repositório. Criar um Blueprint apontando para essa branch. Conferir os dois recursos no plano Free antes de confirmar.
3. O Blueprint obtém a conexão interna do banco e gera chaves independentes e senhas aleatórias. Não há senhas padrão no código. O acesso público direto ao banco está bloqueado por `ipAllowList: []`.
4. A inicialização aplica migrações, prepara os dados fictícios e inicia o servidor. O endpoint `/api/operations/health` verifica a conexão com o banco. O endereço do serviço é usado automaticamente como origem permitida.
5. Após a publicação, consultar as três senhas `DEMO_ADMIN_PASSWORD`, `DEMO_PATIENT_PASSWORD` e `DEMO_STAFF_PASSWORD` nas configurações protegidas do serviço. Compartilhar somente os acessos necessários, por canal adequado. Não incluir senha administrativa no relatório público.
6. Testar pelo endereço HTTPS: login de paciente, reserva, histórico, reagendamento, cancelamento e acesso profissional. Registrar data, dispositivo/rede e resultados realmente observados.

Contas: `paciente@example.test`, `recepcao@example.test`, `enfermagem@example.test`, `coordenacao@example.test` e `admin@example.test`. Os três perfis de equipe compartilham a senha fictícia `DEMO_STAFF_PASSWORD` nesta demonstração; isso não é um procedimento para operação institucional. A conferência de identidade das contas de exemplo é simulada e registrada como tal. Nenhuma revisão clínica é criada automaticamente.

O seed exige `DEMO_MODE=true`, ambiente `staging` ou `test`, banco terminado em `_demo` ou `_test` e senhas válidas. Recusa bancos ocupados por outra instalação. Pode ser repetido sem redefinir contas, senhas ou reservas: mantém os dados e acrescenta horários ainda não cadastrados para os próximos sete dias. Isso ocorre na inicialização, não por uma tarefa periódica. Uma instância que fique ligada por muitos dias pode precisar de novos horários na gestão ou de reinicialização controlada. Se houver troca das chaves, a inicialização recusa ler o marcador anterior; não regenere chaves de uma instalação existente.

No plano gratuito, o Render suspende a aplicação após 15 minutos sem tráfego, e o retorno pode levar cerca de um minuto. O banco gratuito expira após 30 dias e não possui backup gerenciado. SMTP nas portas habituais e shell remoto também não estão disponíveis nesse plano. A demonstração mantém envio desativado e executa a preparação no início do processo para não depender de shell ou hook de pré-deploy pago. Não usar essa configuração para pacientes reais.

Auto-deploy está desativado no Blueprint: atualizações exigem uma implantação manual. Mudança para domínio próprio exige atualizar `FRONTEND_ORIGINS` com a origem HTTPS exata; não derive a origem de cabeçalhos enviados pelo visitante.

## HTTPS e sessão

`TLS_TERMINATION=direct` continua sendo o padrão: produção exige arquivos de certificado e chave na aplicação. O modo `proxy` é uma escolha explícita para plataformas que encerram o HTTPS e isolam o HTTP entre o proxy e a aplicação. Mesmo nesse modo, origens continuam restritas a HTTPS e o cookie `__Host-sf_session` mantém `Secure`, `HttpOnly`, `SameSite=Strict` e `Path=/`.

Não habilitamos confiança genérica em `X-Forwarded-For` ou `X-Forwarded-Proto`. Como consequência, visitantes atrás do mesmo proxy podem compartilhar o limite de requisições por IP. Avaliação de uso simultâneo e configuração de proxies confiáveis devem anteceder utilização ampla. Não exponha a porta HTTP interna diretamente à internet.

Chaves aceitam 32 bytes em hexadecimal ou base64 canônico, para compatibilidade com o gerador de segredos do Render. Os formatos representam a mesma chave; não há redução do tamanho exigido.

## Demonstração local isolada e túnel temporário

O preparo local usa outro projeto Compose, banco, volume e chaves. Não reutiliza os ambientes de desenvolvimento/homologação existentes.

```bash
node scripts/prepare-demo.mjs https://origem-publica-do-tunel
docker build -f backend/Dockerfile -t saude-facil:demo .
docker compose --project-name saude-facil-demo --env-file deploy/config/demo.env -f deploy/compose.yaml -f deploy/compose.demo.yaml up -d --wait app
```

As credenciais ficam somente em `deploy/secrets/demo/ACESSOS.txt`, com acesso restrito e fora do Git. O script recusa sobrescrever uma instalação já preparada. Para mudar apenas o endereço do túnel, altere `FRONTEND_ORIGINS` em `deploy/config/demo.env`, preserve os segredos e recrie somente o serviço `app` com o mesmo comando Compose.

Um Quick Tunnel da Cloudflare pode encaminhar HTTPS público ao HTTP privado da demonstração. Ele não necessita de conta ou domínio, mas depende de computador, internet e processo ativos. O endereço muda ao recriar o túnel. Não é um endereço permanente para entrega futura.

Nesta sessão, o túnel foi executado com a imagem oficial `cloudflare/cloudflared@sha256:e613aadbc2d9511785d2e67a86b0c8ac18dd63a3f9af0d06faf04cbfdcb35f2d`, ligado somente à rede externa da demonstração:

```bash
docker run -d --name saude-facil-demo-tunnel --network saude-facil-demo_external --read-only --cap-drop ALL --security-opt no-new-privileges:true cloudflare/cloudflared@sha256:e613aadbc2d9511785d2e67a86b0c8ac18dd63a3f9af0d06faf04cbfdcb35f2d tunnel --no-autoupdate --protocol http2 --url http://app:3001
```

Não repita a criação se esse container já existir. Obtenha o endereço atual em `docker logs saude-facil-demo-tunnel`; se o túnel for recriado, atualize a origem da aplicação antes de testar o login. O container de túnel não tem reinicialização automática para evitar trocar silenciosamente o endereço depois de uma reinicialização do computador.

A verificação pública pode ser repetida na pasta `backend` com `node test/support/public-demo-check.cjs https://origem-atual-do-tunel`, após preparar o navegador e suas dependências conforme o README. Esse roteiro usa as contas fictícias, cria um agendamento, reagenda e cancela, valida o acesso profissional e grava evidências em `test-results/`. As senhas são lidas dos arquivos locais protegidos ou das variáveis `DEMO_PATIENT_PASSWORD` e `DEMO_STAFF_PASSWORD`; não são argumentos do comando nem são impressas.

Para interromper a demonstração sem excluir dados, use `docker compose --project-name saude-facil-demo --env-file deploy/config/demo.env -f deploy/compose.yaml -f deploy/compose.demo.yaml stop`. Se houver um container de túnel separado, interrompa-o também. Preserve o volume e as chaves; não use `down --volumes` se quiser manter o histórico.

O túnel atual pode ser interrompido com `docker stop saude-facil-demo-tunnel`. Isso tira o endereço público do ar sem apagar contas ou agendamentos.

## Referências verificadas

- [Blueprint e geração de segredos](https://render.com/docs/blueprint-spec).
- [HTTPS no proxy do Render](https://render.com/docs/web-services#connect-to-your-web-service).
- [Variáveis fornecidas pelo Render](https://render.com/docs/environment-variables).
- [Limites dos serviços gratuitos](https://render.com/docs/free).
- [Túneis temporários da Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
