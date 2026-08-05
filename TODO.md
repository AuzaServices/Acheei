# TODO - Correção do Bug de Pagamento (Liberação indevida do chat)

## Objetivo
Só marcar a solicitação como `pago` (e liberar o chat) quando o Mercado Pago confirmar um pagamento com status `approved` e valor correto (R$ 14,99). Impedir que o sistema libere sem pagamento real.

## Passos
- [x] 1. Corrigir endpoint `POST /api/pagamento/verificar/:id`:
  - [x] Usar somente o `payment_id`/`preference_id` armazenado (lookup exato).
  - [x] Se não `approved`, retornar `pendente` sem cair na busca genérica.
  - [x] Remover busca genérica por `solicitacao_${id}` (causa falso positivo).
- [x] 2. Corrigir `consultarStatusPagamento()` (usado no `/confirmar`):
  - [x] Aplicar mesma lógica segura (lookup exato pelo ref armazenado).
  - [x] Remover busca genérica solta.
- [x] 3. Corrigir `processarPagamento()` (webhook):
  - [x] Aceitar `solicitacao_ID` e `solicitacao_ID_timestamp`.
  - [x] Exigir `status === 'approved'` + valor correto.
- [x] 4. Corrigir `/preferencia` para salvar `|ref:` exato (consistência na verificação).
- [x] 5. Revisar frontend `profissional.js` (polling 5s) - confirmar que só libera com status real.
- [ ] 6. Testar o fluxo completo (requer ambiente com Mercado Pago configurado).
