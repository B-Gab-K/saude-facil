# Saúde Fácil — demonstração acadêmica

Protótipo para percursos fictícios de pacientes e profissionais, com interface HTML/JavaScript, API NestJS e PostgreSQL via Prisma. As solicitações são persistidas no banco local; cadastro e orientação temporária ficam no navegador.

**Use somente dados inventados.** A aplicação não tem autenticação nem autorização, não é prontuário, não reserva vagas e não está conectada ao SUS ou a uma UBS. As regras de sintomas não são diagnóstico nem triagem clínica. Não exponha a API ou o banco à internet.

## Execução local

Requisitos: Node.js 22+, npm, Docker e Python 3. Os exemplos usam a porta 55432 para não interferir em um PostgreSQL já instalado.

1. Crie o banco de demonstração (apenas na primeira execução):

```bash
docker run --name saude-facil-demo-db -e POSTGRES_USER=saude -e POSTGRES_PASSWORD=saude -e POSTGRES_DB=saude_facil -p 127.0.0.1:55432:5432 -d postgres:16-alpine
```

Nas próximas vezes, inicie o mesmo banco com `docker start saude-facil-demo-db`. A senha acima é exclusivamente para o ambiente local fictício.

2. Em um terminal, instale as dependências e inicie a API:

```bash
cd backend
npm ci
export DATABASE_URL='postgresql://saude:saude@localhost:55432/saude_facil?schema=public'
npm run prisma:generate
npm run prisma:migrate
npm run build
npm start
```

3. Em outro terminal, na raiz do projeto, inicie o frontend:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra http://localhost:8000. Mantenha os dois terminais abertos. O banco precisa estar pronto antes de executar a migração. Se a API estiver indisponível, as solicitações não serão salvas.

## Fluxos

- **Paciente:** cadastro fictício → descrição dos sintomas → solicitação de preferência → confirmação → histórico. A data solicitada não representa uma vaga reservada.
- **Profissional:** acesso demonstrativo → painel de solicitações → detalhes e atualização de situação. Não existe autenticação; o acesso é compartilhado na instalação local.
- A navegação inferior oferece acesso às telas principais em dispositivos móveis. No agendamento, a busca de endereço usa OpenStreetMap/Nominatim após o clique e exige internet; confira o resultado. O endereço da UBS Vila Irene continua desabilitado por estar pendente de confirmação.
- O botão de ditado depende da API de reconhecimento de voz do navegador, da permissão de microfone e, possivelmente, de serviço externo. Quando indisponível, digite a queixa e revise a transcrição antes de continuar.

A API só escuta em `127.0.0.1:3001` e aceita o frontend das origens locais documentadas. O cadastro no navegador identifica o histórico pelo CPF fictício, o que não é controle de acesso. Antes de qualquer uso com pessoas reais são indispensáveis identidade verificada, autorização por perfil, proteção e auditoria dos dados, revisão clínica, validação de endereços e disponibilidade, e avaliação jurídica e de segurança.

Os documentos de requisitos e roteiros anteriores descrevem a versão estática original e podem conter referências ao armazenamento local que não se aplicam à persistência atual.
