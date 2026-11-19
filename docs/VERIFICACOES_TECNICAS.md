# Verificações técnicas realizadas

Este arquivo documenta verificações automáticas e **não substitui testes de usabilidade com pessoas**.

- [x] Sintaxe de JavaScript (`node --check`) para scripts globais e scripts inline das nove páginas.
- [x] Links relativos internos `.html` conferidos quanto à existência do arquivo de destino.
- [x] Renderização estática das nove páginas em 390 px e 1280 px: sem rolagem horizontal detectada.
- [x] Interação simulada no navegador: cadastro fictício, orientação de sintomas, solicitação fictícia e cancelamento.
- [x] Interação simulada no navegador: carregar três casos, buscar/filtrar, abrir detalhe e mudar status para “Em análise”.
- [x] Interação simulada no navegador: status atualizado também visível no histórico do paciente fictício, com o mesmo armazenamento local.
- [x] Orientação didática com termo de possível emergência não oferece o botão normal de prosseguimento.
- [ ] Teste completo com navegação real entre URLs usando servidor local: bloqueado por política de rede do ambiente de testes disponível; deve ser repetido no computador do grupo.
- [ ] Teste com usuários externos e preenchimento do roteiro de usabilidade: responsabilidade do grupo, a realizar antes da entrega.
- [ ] Verificação de mapa online e dos endereços em funcionamento real: requer internet e confirmação da UBS.
- [ ] Avaliação de acessibilidade formal com leitor de tela e auditoria WCAG: não realizada.
- [ ] Validação clínica e FHIR: não realizada; sistema não indicado para uso operacional.

**Atenção:** conteúdo e registros são apenas demonstrações acadêmicas, sem comunicação com sistemas oficiais.
