# Verificação da implementação de agendamentos

Verificação executada em 18/11/2026 (America/Cuiaba), com PostgreSQL 16 em container exclusivo de teste, sem alterar banco operacional e sem criar commits.

## Resultados

- Compilação TypeScript concluída; editor sem diagnósticos.
- Cinco testes unitários aprovados: autenticação da criptografia e do contexto, senhas com salt, regras de estado/perfil, orientação educativa e rejeição de configuração de produção insegura.
- Doze cenários de integração aprovados com PostgreSQL real: publicação validada de catálogo, cadastro sem elevação de privilégio, conferência de identidade, criptografia e arquivo legado, concorrência por vaga, isolamento por paciente/unidade, restrição de leitura clínica, sobreposição de recursos, datas/estados inválidos, paginação e busca, reagendamento transacional, versionamento, CSRF, auditoria sem UPDATE/DELETE, revogação de sessão, revisão educativa, conflito de agenda por paciente, liberação de vaga por cancelamento, finalização assistencial, retenção configurada, expiração e alteração de senha, logs e limites de requisição.
- `npm audit --omit=dev`: nenhuma vulnerabilidade conhecida reportada nas dependências de execução naquele momento.
- Verificação de sintaxe dos scripts e existência das referências locais das páginas.

## Navegador

Teste com contas e agenda fictícias em schema temporário, servidos pela própria API:

1. Login do paciente e histórico vazio.
2. Seleção de unidade, serviço e horário; envio de motivo opcional; confirmação da reserva com data/horário.
3. Histórico, reagendamento e confirmação no novo horário.
4. Logout; login administrativo; visualização e alteração do andamento na área profissional.
5. Abertura da gestão com unidade, serviço e formulários de horários/equipe carregados.

Não foram realizados teste de usabilidade com pacientes, auditoria formal de acessibilidade, verificação de áudio/microfone, precisão de geocodificação, testes de carga ou pentest independente. A verificação técnica não constitui aprovação clínica, jurídica ou institucional. Ambientes de produção, deploy, backup e notificações continuam fora desta etapa.

## Atualização de 20/11/2026 — experiência e operação

- Cadastro progressivo: nome/e-mail/senha primeiro, identificação separada antes da conferência presencial.
- Cinco testes unitários e quatorze cenários de integração com PostgreSQL aprovados, incluindo nova etapa de identificação, responsável/prazo, SMTP local, consentimento, confirmação de endereço, deduplicação e revogação.
- Quatro testes Playwright aprovados: cadastro progressivo; reserva/reagendamento/cancelamento; falha de rede com campos preservados; teclado, axe e reflow em 320/1280 px. A avaliação automática cobriu dez telas públicas e autenticadas. Não houve violações detectadas pelas regras WCAG 2/2.1 A/AA usadas pelo axe nesses estados.
- Build da imagem de aplicação concluído. Desenvolvimento e homologação local iniciados com redes, volumes, chaves e bancos separados. Migrações e saúde verificadas; homologação testada em HTTPS com certificado autoassinado de teste e validação pelo cliente, sem publicação externa.
- Backup do ambiente de desenvolvimento cifrado em AES-256-GCM e com manifesto de integridade criado. Um teste de recuperação em PostgreSQL restaurou dados pessoais cifrados, validou a leitura com a chave original e rejeitou backup adulterado, chave incorreta e banco ocupado sem gravar no destino vazio.
- CI e deploy manual com imagem imutável preparados em arquivos locais. Workflow remoto, agendamento de backups no servidor, cópia externa e SMTP real não foram ativados sem acessos/destinos aprovados.
- `npm audit --omit=dev` não reportou vulnerabilidades conhecidas nas dependências de execução na verificação desta etapa.

Faltam participantes/facilitador para o [teste de usabilidade e tecnologia assistiva real](../TESTES_DE_USABILIDADE.md). O [procedimento operacional](../OPERACAO_E_DEPLOY.md) identifica os acessos e decisões ainda necessários. Nenhum resultado de usuários reais foi atribuído aos testes automatizados.

## Atualização de 20/11/2026 — hospedagem de demonstração

- Preparado `render.yaml` com aplicação Docker e PostgreSQL 16 em planos explicitamente gratuitos, banco sem acesso público direto, segredos gerados pela plataforma e inicialização com migrações. O YAML passou pela validação do JSON Schema oficial do Render. Não foi criada conta nem serviço no Render, e a versão local não foi enviada ao GitHub nesta etapa.
- Adicionado modo explícito de HTTPS no proxy, preservando cookie `__Host-`, Secure, HttpOnly, SameSite=Strict e origens HTTPS. TLS direto permanece o padrão. Corrigida a leitura da trava transacional no bootstrap administrativo e validada a criação única do primeiro administrador.
- Nove testes unitários aprovados; quatorze cenários anteriores de integração e quatro cenários de hospedagem aprovados com PostgreSQL real em schemas descartáveis. Os testes incluem seed concorrente/idempotente, recusa de banco ocupado, recusa de chaves trocadas, inicialização hospedada, sessão segura, reserva e autorização. O container exclusivo de testes foi removido ao concluir.
- Quatro testes Playwright aprovados, usando bibliotecas de navegador temporárias já existentes. Nenhum pacote do sistema foi instalado. Cobertura anterior de teclado, axe, reflow e fluxos de paciente/profissional preservada.
- Criado o projeto Compose separado `saude-facil-demo`, com banco, volume, chaves e cinco contas fictícias. Os ambientes existentes não foram recriados. As senhas ficam fora do Git em `deploy/secrets/demo/ACESSOS.txt`. Nenhuma revisão clínica institucional foi registrada automaticamente.
- Aberto Quick Tunnel Cloudflare somente para essa demonstração: https://dates-paragraphs-systematic-cfr.trycloudflare.com. A imagem oficial foi identificada por digest. O endereço é temporário e depende de computador, internet e container de túnel ativos; não representa hospedagem permanente.
- Às 11h45 de 20/11/2026 (America/Cuiaba), verificação automatizada pelo endereço HTTPS público concluiu acesso à página inicial, aviso de dados fictícios, login do paciente, cookie seguro, reserva, reagendamento, cancelamento, login da recepção e bloqueio de acesso à gestão. A página inicial de demonstração passou pelas regras axe aplicadas e reflow em viewport de 390 px. A navegação foi executada na mesma máquina; não houve avaliação com pessoa externa ou dispositivo físico adicional.
- Evidências locais em `backend/test-results/demo-publica.json`, `demo-publica-inicio.png` e `demo-publica-confirmacao.png`. O roteiro reproduzível está em `backend/test/support/public-demo-check.cjs`. O leitor web externo desta sessão não conseguiu abrir o endereço; a verificação concluída foi a do Chromium pelo URL público, não uma confirmação independente em outra rede.

A etapa acima registrava o túnel temporário. A publicação no Render foi concluída posteriormente, conforme a atualização abaixo.

## Atualização de 20/11/2026 — publicação no Render

- Release enviada ao repositório GitHub e conteúdo remoto conferido antes de criar o Blueprint. Plano revisado e aplicado com autorização do responsável no workspace My Workspace.
- Aplicação https://saude-facil-demo-hhyy.onrender.com e PostgreSQL 16 em planos Free. Banco sem acesso público direto, com expiração informada pela plataforma em 20/12/2026. Nenhum plano pago foi selecionado. Sincronização do Blueprint e deploy automático desativados.
- Implantação `dep-dc08st6tlv9c739gpi10` do commit `fb1716a2e91a3fa29d0b24c9da2b00c66a74960f` confirmada como `live` às 14h17 (America/Cuiaba). Quatro migrações aplicadas e 21 horários fictícios preparados, conforme os logs de inicialização.
- Corrigidas as aspas do comando de saúde do PostgreSQL no CI. A [execução remota corrigida](https://github.com/B-Gab-K/saude-facil/actions/runs/44791109848) passou em todas as etapas, incluindo testes de integração/navegador, build Docker, inicialização e recuperação de backup em ambiente de teste.
- Entre 14h18 e 14h19, acesso HTTPS público com saúde HTTP 200, modo de demonstração e catálogo fictício. Navegador automatizado em 390 e 1280 px: aviso de demonstração, formulário de login, ausência de rolagem horizontal e nenhuma violação nas regras axe aplicadas à página inicial. Com uma conta adicional fictícia: cadastro, login, logout, histórico, cookie Secure/HttpOnly/SameSite=Strict, bloqueio de gestão e recusa de reserva sem identidade conferida.
- Às 14h25, o roteiro completo passou no endereço público: login do paciente pré-carregado, cookie seguro, reserva, histórico, reagendamento, cancelamento, login da recepção e bloqueio de acesso à gestão. As duas senhas geradas no Render foram lidas de arquivo protegido e passadas ao processo sem exibição; não foram usados segredos locais anteriores nem senha administrativa.
- Não houve teste em outro dispositivo físico, outra rede ou com usuários externos. O leitor web externo não abriu o endereço; HTTP e Chromium na máquina de execução foram os verificadores utilizados. O roteiro completo usou viewport de 390 × 844 px; isso não equivale a um teste em celular físico.
- Evidências em `/tmp/saude-render-public-evidence/`. DOCX, configurações e segredos locais tiveram integridade conferida e não foram alterados. Consulte [hospedagem da demonstração](HOSPEDAGEM_DEMONSTRACAO.md).

## Atualização de 20/11/2026 — acessos para avaliação

- Redefinição das senhas das cinco contas fictícias solicitada pelo responsável, com valores padronizados de pelo menos 12 caracteres, entregues fora do Git. Implementada operação única por identificador, limitada a demonstração já inicializada em staging/test e banco exclusivo. Atualiza hashes, remove bloqueios e revoga sessões apenas das cinco contas conhecidas; demais contas e registros permanecem preservados.
- Compilação e testes unitários aprovados. Integração com PostgreSQL temporário validou concorrência, execução única, troca das cinco senhas, remoção dos bloqueios, revogação das sessões, preservação de outra conta e recusa de banco sem marcador de demonstração. O container temporário foi removido.
- Versão `2f72ebb9d2dae449258af8ba48825e533d4e9dfa` confirmada como `live` no Render às 14h46, implantação `dep-dc09an8n74is73a8a9j0`. [CI remoto aprovado](https://github.com/B-Gab-K/saude-facil/actions/runs/44795767219).
- Às 14h48, os cinco perfis passaram no login, tela autenticada, permissões de gestão e logout pelo endereço público. Reserva, histórico, reagendamento, cancelamento e acesso profissional também passaram com as novas senhas. Evidências em `/tmp/saude-render-password-reset-evidence/`. Navegador automatizado na mesma máquina; não houve teste em outro dispositivo físico ou com usuários externos. DOCX e segredos/configurações dos ambientes locais foram preservados.
