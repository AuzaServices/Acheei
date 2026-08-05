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

## Tarefa 3 - Aba de Configurações do Profissional (Concluída)
- [x] Adicionar botão de engrenagem (configurações) no header do profissional (ao lado de "Sair").
- [x] Criar modal de configurações para editar foto de perfil, até 3 fotos de serviços e dados de cadastro.
- [x] Campos editáveis: nome, email, data de nascimento, endereço, número, bairro, cidade, estado, CEP.
- [x] Campos NÃO editáveis (desabilitados): CPF e Profissão.
- [x] Upload de imagens via Cloudinary (redimensionamento + upload) para perfil e serviços.
- [x] Salvar tudo de uma vez via `PUT /api/profissionais/me` (protegido por JWT).
- [x] Atualizar o header (nome/foto) e o global após salvar.
- [x] Modal com scroll interno para não estourar a tela.
- [ ] Testar fluxo completo no navegador.
