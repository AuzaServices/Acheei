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

## Tarefa 4 - Corrigir mensagem repetida infinitamente no chat do cliente (Concluída)
- [x] Identificar a causa: o backend `routes/clientes.js` retorna 403 "O chat ainda não foi liberado..." quando o pagamento não foi feito, e o frontend `cliente.js` spammava o toast de erro a cada polling de 5s.
- [x] `apiRequest` em `cliente.js`: tratar 403 como resposta normal (sem lançar exceção) para não disparar toast repetidamente.
- [x] `carregarChat()`: quando o chat está bloqueado (403), exibir a mensagem fixa no corpo do chat e NÃO iniciar o polling (evita repetição infinita).
- [x] `widgetCarregarMensagens()`: quando o widget está bloqueado (403), exibir a mensagem fixa no painel sem repetir toast.
- [ ] Testar fluxo completo no navegador.

## Tarefa 5 - Fluxo integrado de cadastro/solicitação do cliente na home (Em andamento)
### 5.1 Header da home com área do usuário logado
- [x] Adicionar bloco `#userArea` no header do `index.html` (foto + nome + botão Sair).
- [x] `verificarLoginCliente()` em `main.js` consulta `/api/clientes/me` e renderiza área do usuário.
- [x] `sairClienteHome()` remove token e recarrega.
- [x] Atualizar o menu mobile para incluir a área do usuário.
- [x] Adicionar CSS para `.user-area`, `.user-avatar`, `.user-name`, `.mobile-user-area` e `.modal-cadastro-section`.

### 5.2 Modal de solicitação simples para cliente logado
- [x] Na abertura do modal, detectar se o usuário está logado.
- [x] Se logado: esconder campos de cadastro (nome, email, senha, telefone, aviso push) e mostrar só a descrição.
- [x] Se não logado: manter o modal completo atual (cadastro embutido).

### 5.3 Envio de solicitação e redirecionamento
- [x] `enviarSolicitacao()`: quando logado, enviar apenas `{descricao, profissional_id, cliente_id}`.
- [x] `routes/solicitacoes.js` POST `/`: aceitar `cliente_id` e buscar nome/telefone do cliente no banco.
- [x] Após cadastro novo, redirecionar para `cliente.html` (já logado).
- [x] Após login (conta existente), permanecer na página (comportamento atual).
- [ ] Testar fluxo completo no navegador.
