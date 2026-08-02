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

## Pendente (usuário precisa fazer)
- [ ] 8. Adicionar `MERCADO_PAGO_ACCESS_TOKEN=TEST-...` no arquivo `.env`
- [ ] 9. Reiniciar o servidor (Ctrl+C no terminal atual e rodar `node server.js` de novo)
</｜DSML｜content>
