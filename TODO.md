# TODO - Notificações de Mensagens (Badge) + Rejeição de Solicitação

## Objetivo 1: Badge de mensagens não lidas resetar permanentemente ao abrir a conversa
Ao abrir a conversa, a quantidade de mensagens deve resetar permanentemente (não reaparecer ao atualizar a página). A fonte de verdade é a coluna `lida` no banco.

### Tarefas
- [x] 1. Backend: rota `/api/clientes/solicitacoes` agora retorna `qtd_nao_lidas`, `ultima_mensagem` e `ultima_mensagem_remetente` (contando mensagens do profissional com `lida = FALSE`)
- [x] 2. Backend: rota `/api/solicitacoes/profissional/:id` já retornava `qtd_nao_lidas` (mensagens do cliente com `lida = FALSE`)
- [x] 3. Cliente (`cliente.js`): `verificarNovasMensagensWidget` já usa `sol.qtd_nao_lidas` do backend (persistente) - badge soma as não lidas reais
- [x] 4. Profissional (`profissional.js`): `widgetVerificarNovasMensagensProf` trocado de contagem por ID em memória (`widgetUltimasMensagensProf`) para `sol.qtd_nao_lidas` do backend (coluna `lida` persistente)
- [x] 5. Abrir a conversa marca mensagens como lidas no banco (endpoints GET de mensagens já fazem o UPDATE `lida = TRUE`)
- [x] 6. Badge global zerado ao abrir o painel/conversa (fim do badge "reaparecendo" após reload)

## Objetivo 2: Rejeição de Solicitação no Profissional
Permitir que o profissional rejeite solicitações. Ao rejeitar, a solicitação é excluída e o contador de rejeições aumenta, reduzindo seu ranking nas buscas públicas.

### Tarefas
- [x] 1. Adicionar campo `rejeicoes INT DEFAULT 0` na tabela `profissionais` (schema.sql)
- [x] 2. Criar endpoint DELETE /api/solicitacoes/:id/rejeitar (apaga solicitação + incrementa rejeicoes)
- [x] 3. Penalizar ranking no routes/profissionais.js (ORDER BY subtrai 0.5 por rejeição)
- [x] 4. Adicionar ícone X SVG vermelho no canto superior direito da solicitação (profissional.html + profissional.js)
- [x] 5. Criar modal de alerta de rejeição (influencia na pontuação)
- [x] 6. No mobile, substituir o botão "Pagar R$14,99" por um botão de arrastar verde "Arraste para liberar o chat" com seta minimalista para a direita (aciona o pagamento/liberação do chat)
- [x] 7. Manter botão de pagar no desktop
- [x] 8. Corrigir sobreposição: o X e a data/hora da solicitação não ficam mais juntos no desktop (padding no card-header)
- [ ] 9. Executar o ALTER TABLE no banco para adicionar a coluna `rejeicoes` (em bancos já existentes)
- [ ] 10. Testar fluxo completo
