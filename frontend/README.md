# Interface Saúde Fácil

Páginas HTML e módulos JavaScript servidos pela API. Não há etapa de build do frontend.

## Navegação

| Fluxo | Páginas |
| --- | --- |
| Entrada | `index.html`, `login.html`, `acesso-profissional.html` |
| Cadastro e conta | `cadastro.html`, `identificacao.html`, `conta.html` |
| Paciente | `agendamento.html`, `confirmacao.html`, `historico.html` |
| Equipe | `painel-profissional.html`, `atendimento-profissional.html` |
| Gestão | `gestao.html`, `identidades.html`, `revisao-clinica.html` |
| Orientações | `triagem.html` |

## Assets

`assets/app.js` concentra comunicação com a API e estado da sessão; `nav.js` controla a navegação. Os outros scripts atendem aos fluxos indicados por seus nomes. `style.css` contém a apresentação responsiva e os estados de foco.

Os dados persistidos pertencem à API e ao banco. Sessões usam cookie HttpOnly; o frontend não grava identificadores de paciente em armazenamento local.

Execute pelo [ambiente local da aplicação](../docs/DESENVOLVIMENTO.md), para que as páginas e a API compartilhem a origem. Preserve rótulos, foco visível, navegação por teclado e comportamento nas larguras pequenas ao alterar a interface.
