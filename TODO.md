# TODO - Correção do Balão de Mensagens (reset permanente) + Status "Visto/Enviado"

## Objetivo
Quando abrir a conversa (ou o balão), a quantidade de mensagens não lidas deve ser removida **permanentemente** (não repetir após atualizar página ou fazer login), tanto para Cliente quanto para Profissional. Corrigir também o texto "Visto"/"Enviado" invisível no mobile.

## Passos
- [x] Analisar código (cliente.js, profissional.js, mensagens.js, clientes.js, solicitacoes.js, HTMLs)
- [x] Backend: `routes/clientes.js` - adicionar `qtd_nao_lidas`, `ultima_mensagem`, `ultima_mensagem_remetente` no GET `/clientes/solicitacoes` (já presente)
- [x] Backend: `routes/solicitacoes.js` - GET `/solicitacoes/profissional/:id` já retorna `qtd_nao_lidas`, `ultima_mensagem`, `ultima_mensagem_remetente`
- [x] Frontend: `public/js/cliente.js` - `verificarNovasMensagensWidget()` usa `qtd_nao_lidas` (reset permanente) + badge por conversa
- [x] Frontend: `public/js/profissional.js` - `widgetVerificarNovasMensagensProf()` usa `qtd_nao_lidas` (reset permanente) + badge por conversa (`widgetCarregarSolicitacoesProf`/`widgetAtualizarItemConversa`)
- [x] CSS: remover regra `.msg-status` duplicada em `cliente.html`; cor legível `var(--gray-medium)` no balão do remetente em ambos HTMLs
- [x] Verificado: badge por conversa (`chat-conv-badge`) e global (`chat-badge`) agora usam `qtd_nao_lidas` do backend (reset permanente ao abrir)
- [x] Verificado: restaurar lista de conversas ao fechar/esconder o widget (evita estado "instalado" preso)
- [ ] Testar manualmente
