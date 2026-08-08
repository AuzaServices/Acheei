# To-do: Corrigir botão de chat na Área do Cliente

## Objetivo
Remover o botão "💬 Conversar" abaixo das solicitações na área do cliente e exibir o balão de chat flutuante (canto inferior direito), igual à área do profissional.

## Passos
- [x] 1. Remover o bloco `chatBtn` e o `.card-footer` em `renderizarSolicitacoes()` no `public/js/cliente.js`
- [x] 2. Adicionar `mostrarWidgetChat()` e `esconderWidgetChat()` em `public/js/cliente.js` (espelhando a área do profissional)
- [x] 3. Atualizar `switchTab()` para esconder o balão na aba Chat e mostrar nas demais
- [x] 4. Chamar `mostrarWidgetChat()` ao exibir o dashboard (via `mostrarDashboard()`, usada no login, cadastro e verificação de token)
- [x] 5. Validar sintaxe do arquivo com `node --check` (sem erros)

