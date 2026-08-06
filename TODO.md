# TODO - Correções de Bugs

## public/js/profissional.js
- [x] Bug 1: Não perder a conversa ao sair e voltar para a aba Chat (restaurar seleção)
- [x] Bug 2: Criar/exibir o balão (widget) de chat no painel do profissional com pulso e badge
- [x] Bug 4: Limpar estado do widget no logout e recarregar ao trocar de profissional
- [x] Bug 5: Eliminar flash da tela de login quando já estiver logado (cache otimista)

## public/js/cliente.js
- [x] Bug 3: Abrir a conversa da mensagem mais recente ao clicar no balão

## public/profissional.html e public/cliente.html
- [x] Ajuste de layout do chat no mobile (input/botão não cortados)

## Testes
- [ ] Trocar de aba no painel do profissional e voltar ao chat (mensagem deve enviar)
- [ ] Balão do profissional pulsar ao receber mensagem do cliente
- [ ] Logout -> login com 2 profissionais diferentes (não vazar conversas)
- [ ] Página profissional já logada não piscar a tela de login
- [ ] Balão do cliente abrir na conversa do último profissional que enviou
