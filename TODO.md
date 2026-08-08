# TODO - Corrigir Badge de Notificações de Mensagens

## Objetivo
A quantidade de mensagens não lidas no balão deve resetar permanentemente ao abrir a conversa, mesmo após atualizar a página ou fazer login. A contagem deve ser baseada na coluna `lida` do banco (fonte de verdade), não em estado em memória.

## Tarefas
- [x] 1. Analisar fluxo atual (cliente.js, profissional.js, mensagens.js, clientes.js)
- [ ] 2. Backend: adicionar `qtd_nao_lidas` e `ultima_mensagem` no endpoint `/clientes/solicitacoes` (routes/clientes.js)
- [ ] 3. Frontend profissional: usar `qtd_nao_lidas` do backend em `widgetVerificarNovasMensagensProf` (remover dependência de `widgetUltimasMensagensProf`)
- [ ] 4. Garantir que abrir a conversa marca mensagens como lida (já implementado em /clientes/mensagens e /mensagens)
- [ ] 5. Testar fluxo completo (abrir balão → resetar → atualizar página → badge não reaparece)
