# Hospedagem da demonstração acadêmica

Preparação em 20/11/2026. O arquivo `render.yaml` provisiona uma demonstração separada: aplicação Docker e PostgreSQL 16, ambos no plano gratuito explícito. Não provisiona uma operação institucional. Os dados são fictícios e as notificações ficam desativadas. A interface usa a apresentação padrão do portal, sem aviso acadêmico recorrente; a identificação do ambiente fica na configuração e nesta documentação.

Estado atualizado em 20/11/2026: demonstração publicada em https://saude-facil-demo-hhyy.onrender.com. A implantação inicial `dep-dc08st6tlv9c739gpi10`, do commit `fb1716a2e91a3fa29d0b24c9da2b00c66a74960f`, atingiu o estado `live` às 14h17 (America/Cuiaba). A aplicação `saude-facil-demo-hhyy` e o PostgreSQL 16 `saude-facil-demo-db-hhyy` usam planos Free, no workspace My Workspace autorizado pelo responsável. O banco tem acesso público direto bloqueado e expira em 20/12/2026, às 14h15 (America/Cuiaba).

A consulta do repositório remoto confirmou todos os arquivos da release antes da criação do Blueprint. O CI corrigido passou em https://github.com/B-Gab-K/saude-facil/actions/runs/44791109848, incluindo compilação, testes unitários, integração, navegador, imagem Docker, inicialização com migrações e recuperação de backup em ambiente de teste. O ajuste do CI corrigiu somente as aspas do healthcheck do PostgreSQL.

Entre 14h18 e 14h19 de 20/11/2026, o endereço público respondeu HTTP 200 na página inicial e no endpoint de saúde, com modo de demonstração ativo e catálogo fictício. O Chromium automatizado verificou a página inicial e o formulário de login em 390 e 1280 px, sem rolagem horizontal nem violações nas regras axe aplicadas à página inicial. Uma conta adicional inteiramente fictícia foi cadastrada pelo navegador; login, logout, histórico vazio, cookie seguro, bloqueio de gestão e recusa de reserva sem identidade conferida passaram. Não houve teste em outro dispositivo físico, outra rede ou com usuários externos. O leitor web externo da sessão não conseguiu abrir o endereço; os testes concluídos foram os acessos HTTP e o Chromium pelo URL público.

Às 14h25 de 20/11/2026, o roteiro completo também passou pelo endereço público: login do paciente pré-carregado, cookie seguro, reserva, histórico, reagendamento, cancelamento, login da recepção e bloqueio de acesso à gestão. O responsável disponibilizou apenas `DEMO_PATIENT_PASSWORD` e `DEMO_STAFF_PASSWORD` geradas pelo Render em arquivo temporário protegido; o processo as leu como variáveis de ambiente, sem exibi-las nem usar segredos da demonstração local. Nenhuma senha administrativa foi necessária. Essa execução usou Chromium automatizado com viewport de 390 × 844 px na mesma máquina; não representa teste em outro dispositivo físico nem outra rede. Evidências em `/tmp/saude-render-public-evidence/`, incluindo `test-results/demo-publica.json`, `demo-publica-inicio.png` e `demo-publica-confirmacao.png`.

Os ambientes locais e seus segredos foram preservados. A demonstração anterior usa o túnel temporário https://dates-paragraphs-systematic-cfr.trycloudflare.com, verificado às 11h45 de 20/11/2026, e depende do computador e do container `saude-facil-demo-tunnel`. As credenciais locais continuam em `deploy/secrets/demo/ACESSOS.txt`, fora do Git. Não reutilizar essas credenciais no Render.

## Render

1. Enviar a versão atual do projeto, incluindo `render.yaml`, para a branch que será publicada. A presença local desses arquivos não atualiza o GitHub.
2. Autorizar uma conta Render e o acesso ao repositório. Criar um Blueprint apontando para essa branch. Conferir os dois recursos no plano Free antes de confirmar.
3. O Blueprint obtém a conexão interna do banco e gera chaves independentes e senhas aleatórias. Não há senhas padrão no código. O acesso público direto ao banco está bloqueado por `ipAllowList: []`.
4. A inicialização aplica migrações, prepara os dados fictícios e inicia o servidor. O endpoint `/api/operations/health` verifica a conexão com o banco. O endereço do serviço é usado automaticamente como origem permitida.
5. Após a publicação, consultar as três senhas `DEMO_ADMIN_PASSWORD`, `DEMO_PATIENT_PASSWORD` e `DEMO_STAFF_PASSWORD` nas configurações protegidas do serviço. Compartilhar somente os acessos necessários, por canal adequado. Não incluir senha administrativa no relatório público.
6. Testar pelo endereço HTTPS: login de paciente, reserva, histórico, reagendamento, cancelamento e acesso profissional. Registrar data, dispositivo/rede e resultados realmente observados.

Contas: `paciente@example.test`, `recepcao@example.test`, `enfermagem@example.test`, `coordenacao@example.test` e `admin@example.test`. Os três perfis de equipe compartilham a senha fictícia `DEMO_STAFF_PASSWORD` nesta demonstração; isso não é um procedimento para operação institucional. A conferência de identidade das contas de exemplo é simulada e registrada como tal. Nenhuma revisão clínica é criada automaticamente.

O seed exige `DEMO_MODE=true`, ambiente `staging` ou `test`, banco terminado em `_demo` ou `_test` e senhas válidas. Recusa bancos ocupados por outra instalação. Por padrão, pode ser repetido sem redefinir contas, senhas ou reservas: mantém os dados e acrescenta horários ainda não cadastrados para os próximos sete dias. Isso ocorre na inicialização, não por uma tarefa periódica. Uma instância que fique ligada por muitos dias pode precisar de novos horários na gestão ou de reinicialização controlada. Se houver troca das chaves, a inicialização recusa ler o marcador anterior; não regenere chaves de uma instalação existente.

No plano gratuito, o Render suspende a aplicação após 15 minutos sem tráfego, e o retorno pode levar cerca de um minuto. O banco gratuito expira após 30 dias e não possui backup gerenciado. SMTP nas portas habituais e shell remoto também não estão disponíveis nesse plano. A demonstração mantém envio desativado e executa a preparação no início do processo para não depender de shell ou hook de pré-deploy pago. Não usar essa configuração para pacientes reais.

Auto-deploy está desativado no Blueprint: atualizações exigem uma implantação manual. Mudança para domínio próprio exige atualizar `FRONTEND_ORIGINS` com a origem HTTPS exata; não derive a origem de cabeçalhos enviados pelo visitante.

## Redefinição das cinco contas de demonstração

Em 20/11/2026, o responsável solicitou senhas padronizadas para avaliação pelo professor. A versão `2f72ebb9d2dae449258af8ba48825e533d4e9dfa` foi implantada como `dep-dc09an8n74is73a8a9j0` e ficou `live` às 14h46. Somente as três variáveis de senha e o identificador de redefinição foram alterados no Render; chaves, banco, planos e ambientes locais foram preservados. As novas senhas mantêm o mínimo de 12 caracteres e são entregues separadamente, sem registro no Git.

Às 14h48, login, tela inicial autenticada, permissões de gestão e logout passaram para administrador, paciente, recepção, enfermagem e coordenação pelo URL público. O roteiro de reserva, histórico, reagendamento, cancelamento e acesso profissional também passou com as senhas novas. O [CI da versão](https://github.com/B-Gab-K/saude-facil/actions/runs/44795767219) concluiu todas as etapas com sucesso. Evidências separadas em `/tmp/saude-render-password-reset-evidence/`; testes em Chromium automatizado na mesma máquina, sem avaliação em outro dispositivo físico ou com pessoas externas.

Para uma redefinição autorizada nesta instalação, ajustar somente `DEMO_ADMIN_PASSWORD`, `DEMO_PATIENT_PASSWORD` e `DEMO_STAFF_PASSWORD` no serviço Render e informar um identificador novo em `DEMO_PASSWORD_RESET_ID` (8 a 80 caracteres alfanuméricos, hífen ou sublinhado). As senhas devem ter 12 a 128 caracteres e são entregues aos avaliadores separadamente, fora do Git. Não alterar as chaves de criptografia/busca nem a conexão com o banco.

Na próxima implantação, o seed exige o marcador de uma demonstração já inicializada e as cinco identidades fictícias com seus perfis originais. Uma transação troca os hashes das senhas, remove bloqueios por tentativas, revoga as sessões dessas contas e registra `DEMO_PASSWORDS_RESET`, sem gravar senhas na auditoria. Contas cadastradas posteriormente, agendamentos e dados locais são preservados. O identificador é aplicado uma única vez, inclusive sob inicialização concorrente; reiniciar com o mesmo identificador não redefine senhas novamente. Uma nova redefinição exige outro identificador explícito. Esse mecanismo é restrito ao modo de demonstração em banco separado e não cria uma rota pública de manutenção.

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

## Apresentação da interface — 20/11/2026

Removidos o aviso global de demonstração e os estilos antigos de ferramentas acadêmicas. A página inicial apresenta o fluxo de agendamento, e a orientação pública mostra a data de revisão somente quando há revisão válida. Avisos de emergência e limites da orientação de saúde permanecem.

O seed passa a usar “Unidade Saúde Fácil”, “Clínica geral” e nomes sem o sufixo “Demonstração”. Em instalações já inicializadas, a próxima execução atualiza somente os rótulos originais conhecidos, preservando personalizações, identificadores, credenciais, sessões e reservas. O modo isolado, a origem sintética registrada na auditoria e as restrições de notificações permanecem. Publicadas no endereço existente pela implantação `dep-dc09jisipgvc73dm96fg`, do commit `5986ff67cddfa31025ec7639b5a544f4b7168e73`, confirmada como `live` às 15h05 de 20/11/2026 (America/Cuiaba). As verificações de publicação descritas nas seções anteriores se referem às versões anteriores.

Validação local desta alteração: compilação e testes unitários aprovados; sete verificações de integração de hospedagem/seed aprovadas em banco descartável; quatro testes Playwright aprovados, incluindo cadastro, reserva, reagendamento, cancelamento, falha de rede, teclado, axe e reflow em 320/1280 px. A suíte de navegador foi executada com `DEMO_MODE=true` e conferiu a ausência dos rótulos acadêmicos nas páginas públicas e autenticadas. O banco descartável foi encerrado após os testes.

Às 15h06 de 20/11/2026 (America/Cuiaba), a verificação pelo HTTPS público confirmou saúde HTTP 200, os quatro arquivos de interface alterados idênticos ao código local e os novos nomes da unidade/serviço no catálogo. Chromium automatizado verificou início, login e orientações em 390/1280 px, sem aviso acadêmico, rótulos fictícios ou rolagem horizontal. A página inicial passou pelas regras axe aplicadas em ambas as larguras. Nenhum erro de aplicação foi encontrado nos logs consultados desde o início da implantação. Evidências em `/tmp/saude-interface-public-evidence/`. O CI remoto completo passou em https://github.com/B-Gab-K/saude-facil/actions/runs/44798144649.
