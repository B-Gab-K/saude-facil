# Acessos e perfis

## Arquivos privados

| Arquivo local | Finalidade |
| --- | --- |
| `deploy/secrets/ACESSOS.txt` | Acessos atuais do site publicado no Render, com endereço e data de verificação |
| `deploy/secrets/demo/ACESSOS.txt` | Acessos do banco local, separados do site publicado |

Os arquivos ficam fora do Git, dentro de uma pasta privada, com permissão `0600`. O arquivo principal indica quando cada conjunto foi conferido. A cópia versionada do projeto não inclui senhas.

## Perfis do site

| Perfil | Entrada | Uso principal |
| --- | --- | --- |
| Paciente | `/login.html` | Agendar e acompanhar os próprios atendimentos |
| Recepção | `/acesso-profissional.html` | Agenda da unidade e conferência de identidade |
| Enfermagem | `/acesso-profissional.html` | Atendimento e revisão das orientações |
| Coordenação | `/acesso-profissional.html` | Gestão da unidade vinculada |
| Administração | `/acesso-profissional.html` | Gestão geral de unidades, horários e equipe |

Os endereços completos, e-mails, senhas e nomes atuais estão no arquivo privado. As permissões são aplicadas pela API, por perfil e unidade.

## Manutenção

Após uma alteração de senha, atualize o arquivo do ambiente correspondente. Para conferir os acessos, faça login com cada perfil, consulte a sessão e encerre-a; registre a data da verificação. Uma senha lida da configuração sem login confirmado não deve ser apresentada como validada no site.

Não troque os arquivos de senha locais pelos do Render: são bancos diferentes. O arquivo principal pode ser atualizado sem redefinir senhas ou recriar contas.

A criação de novos acessos profissionais ocorre na gestão, por administrador. O bootstrap da API serve apenas para criar o primeiro administrador em uma instalação vazia. A operação de redefinição das cinco contas do ambiente acadêmico tem escopo próprio, descrito no [registro de hospedagem](historico/HOSPEDAGEM_DEMONSTRACAO.md#redefinição-das-cinco-contas-de-demonstração).
