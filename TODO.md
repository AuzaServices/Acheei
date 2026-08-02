# TODO - Integração Mercado Pago (Checkout Pro)

## Objetivo
Substituir pagamento simulado por pagamento real via Mercado Pago Checkout Pro.

## Passos Concluídos
- [x] 1. Instalar SDK `mercadopago` via npm
- [x] 2. Criar `config/mercadopago.js` (configuração SDK + helpers)
- [x] 3. Criar `routes/pagamento.js` (preferencia, webhook, verificar, confirmar)
- [x] 4. Registrar rota `/api/pagamento` no `server.js`
- [x] 5. Adicionar coluna `preference_id` na tabela `solicitacoes`
- [x] 6. Atualizar `database/schema.sql` com coluna `preference_id`
- [x] 7. Atualizar `public/js/profissional.js`:
       - Substituir `PUT /solicitacoes/:id/pagar` por `POST /api/pagamento/preferencia`
       - Redirecionar profissional ao Checkout Pro do Mercado Pago
       - `verificarRetornoPagamento()` para processar retorno do checkout
       - Passar `solicitacao_id` nos back_urls
- [x] 8. Adicionar `MERCADO_PAGO_ACCESS_TOKEN` no arquivo `.env`
- [x] 9. Adicionar `APP_URL=http://localhost:3000` no arquivo `.env`
- [x] 10. Corrigir `routes/pagamento.js`: `auto_return` só quando URL é HTTPS
- [x] 11. Reiniciar o servidor e validar endpoints:
       - `POST /api/pagamento/preferencia` → preferência criada com sucesso (preference_id + init_point)
       - `POST /api/pagamento/webhook` → webhook de teste recebido
       - `POST /api/pagamento/verificar/:id` → status consultado corretamente
       - `GET /api/pagamento/webhook` → webhook ativo

## Observação
O Access Token usado é de produção (`APP_USR-...`), não de teste (`TEST-...`).
Para testar com cartão de teste, usar credenciais de teste do Mercado Pago.
O chat é liberado automaticamente quando o pagamento é aprovado (via webhook ou verificação).

