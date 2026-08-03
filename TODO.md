# TODO - Upgrade Chat com Notificações Push e Widget Messenger

## Objetivo
Implementar notificações push (Chrome/Google), bloquear cadastro/solicitação até aceitar notificações, e criar chat estilo Messenger com bolha pulsante.

## Backend
- [ ] 1. Instalar `web-push` (npm)
- [ ] 2. Criar `config/push.js` (configuração VAPID + helpers)
- [ ] 3. Adicionar coluna `push_subscription` na tabela `clientes` (schema.sql + migration)
- [ ] 4. `routes/clientes.js`: endpoint `POST /api/clientes/push-subscription`
- [ ] 5. `routes/mensagens.js`: enviar notificação push quando profissional enviar mensagem

## Frontend - Notificações
- [ ] 6. Criar `public/sw.js` (service worker para exibir notificações)
- [ ] 7. Criar `public/js/push.js` (register, subscribe, save subscription)
- [ ] 8. `public/cliente.html`: botão "Criar Conta" travado até aceitar notificações
- [ ] 9. `public/js/cliente.js`: fluxo de aceitar notificações antes do cadastro
- [ ] 10. `public/index.html`: botão "Enviar Solicitação" travado até aceitar notificações
- [ ] 11. `public/js/main.js`: pedir permissão e liberar botão

## Frontend - Chat Messenger
- [ ] 12. `public/cliente.html`: widget de chat flutuante (bolha mínimizada + painel)
- [ ] 13. `public/js/cliente.js`: polling de novas mensagens + bolha pulsante
- [ ] 14. `public/css/style.css`: estilos do widget de chat flutuante

## Testes
- [ ] 15. Testar cadastro exige aceitar notificações
- [ ] 16. Testar envio de solicitação exige aceitar notificações
- [ ] 17. Testar notificação push ao profissional enviar mensagem
- [ ] 18. Testar widget de chat Messenger pulsando com nova mensagem

