# TODO - Reset permanente do badge de mensagens não lidas

## Objetivo
Ao abrir uma conversa, zerar permanentemente a contagem de mensagens não lidas do balão (mesmo após recarregar a página ou fazer login novamente). Usar a coluna `lida` do banco como fonte de verdade.

## Etapas

- [x] 1. Backend: `routes/solicitacoes.js` - adicionar `qtd_nao_lidas` no GET `/profissional/:id` (mensagens do cliente não lidas)
- [x] 2. Backend: `routes/clientes.js` - adicionar `qtd_nao_lidas` no GET `/solicitacoes` (mensagens do profissional não lidas)
- [x] 3. Frontend cliente: `public/js/cliente.js` - usar `qtd_nao_lidas` no badge e adicionar badge por conversa no widget
- [x] 4. Frontend profissional: `public/js/profissional.js` - usar `qtd_nao_lidas` no badge e adicionar badge por conversa no widget
- [x] 5. CSS: adicionar estilo `.chat-conv-badge`
- [ ] 6. Testar: enviar mensagens, recarregar página, verificar reset do badge ao abrir conversa
