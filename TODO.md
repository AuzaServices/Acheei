# TODO Acheei

## Tarefa 1 - Correção do Bug de Pagamento (Concluída)
- [x] Corrigir endpoint `POST /api/pagamento/verificar/:id` (lookup exato, sem busca genérica).
- [x] Corrigir `consultarStatusPagamento()` (mesma lógica segura).
- [x] Corrigir `processarPagamento()` (webhook) - aceitar `solicitacao_ID` e `solicitacao_ID_timestamp`.
- [x] Corrigir `/preferencia` para salvar `|ref:` exato.
- [ ] Testar fluxo completo (requer ambiente com Mercado Pago configurado).

## Tarefa 2 - Edição de dados do profissional no painel admin (Concluída)
- [x] Adicionar endpoint `PUT /api/admin/profissional/:id` no backend (atualiza nome, endereco, numero, bairro, cidade, estado, cep, data_nascimento).
- [x] Adicionar ícone de lápis no canto superior direito de cada container editável no modal de detalhes.
- [x] Ao clicar no lápis, abrir formulário de edição inline no container.
- [x] Mostrar botão "Salvar Alterações" (e "Cancelar") na parte inferior do modal quando houver edição.
- [x] Salvar alterações no banco e recarregar para todos verem.
- [ ] Testar fluxo completo no navegador.
