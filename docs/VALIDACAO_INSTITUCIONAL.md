# Validação institucional e clínica

Estado em 18/11/2026: implementação técnica preparada; publicação de agendas depende de confirmação pela instituição. Nenhuma aprovação profissional foi atribuída a pessoas reais pelo agente.

## Fontes municipais consultadas

[Lista da Secretaria Municipal de Saúde de Cáceres](https://www.caceres.mt.gov.br/Telefones-e-Enderecos/Secretaria-municipal-de-saude-7///3/), consultada em 18/11/2026:

| Unidade | Endereço publicado | Pendência |
| --- | --- | --- |
| UBS Dr. Ademar R. de Oliveira — Cavalhada | Rua São Pedro, 1211 — Cavalhada II | Conferir funcionamento, serviços, recursos e horários com a gestão |
| UBS São Miguel | Avenida Marechal Castelo Branco, 289 — São Miguel | Conferir funcionamento, serviços, recursos e horários com a gestão |
| UBS Vila Irene | A lista repete o endereço da Cavalhada | Confirmar endereço e funcionamento antes de publicar |

A lista pública não confirma especialidades, capacidade ou disponibilidade de consulta. Não foram criados serviços ou horários fictícios no catálogo oficial. Registre as unidades na gestão, com a fonte e a referência da confirmação. Os dados só aparecem para pacientes depois da validação explícita da administração/coordenação.

## Orientação de saúde

A implementação anterior associava expressões do texto a encaminhamentos. Essas regras foram retiradas do fluxo operacional: não compreendiam negações ou contexto e não tinham validação clínica.

A versão `education-2026-11-18-v1` apresenta informação geral de segurança, não analisa a queixa, não classifica risco e não decide se alguém pode aguardar. O motivo opcional do atendimento fica cifrado para leitura pela equipe assistencial autorizada. O ditado agora fica junto desse campo no agendamento; ele não é ferramenta diagnóstica.

Fontes primárias consultadas em 18/11/2026:

- [Ministério da Saúde — SAMU 192](https://www.gov.br/saude/pt-br/composicao/saes/samu-192).
- [Ministério da Saúde — Sinais de AVC](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/avc).

Responsável com perfil de enfermagem, após habilitação conferida pela instituição, lê a versão, registra evidência de revisão e validade de até um ano. O registro tem responsável, data, versão, expiração e possibilidade de revogação. Registrar aprovação não habilita triagem automática. Alteração do conteúdo exige nova versão e nova revisão.

Para futura triagem clínica real, falta definir e aprovar o protocolo, responsabilidades, validação clínica, acompanhamento e encaminhamento humano. Essa decisão não foi substituída por um algoritmo nem por uma aprovação fictícia.

## Pendências de liberação

- Responsável institucional e confirmação do uso efetivo da agenda como fonte de reserva.
- Unidades, endereço, serviços, recursos e horários confirmados.
- Profissionais autorizados, habilitação e revisão do conteúdo educativo.
- Procedimento presencial de identidade e política de proteção/retenção de dados aprovados.
- Avaliação jurídica e de segurança pelos responsáveis.

Em 20/11/2026, a infraestrutura e os testes técnicos de interface passaram a ser implementados. Testes com usuários externos, leitor de tela real e ativação da produção permanecem dependentes de participantes, responsáveis e acessos. Veja [operação](OPERACAO_E_DEPLOY.md) e [roteiro de avaliação](TESTES_DE_USABILIDADE.md); não foram declarados concluídos por automação.
