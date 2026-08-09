# TODO - Botão "Chamar no WhatsApp" quando cliente não responde

## Objetivo: Botão verde "Chamar no Whatsapp" (com ícone oficial do WhatsApp)
Quando o cliente não responde há mais de 5 minutos no chat (após o pagamento do profissional), o botão verde "Chamar no Whatsapp" aparece na aba Solicitações para que o profissional chame o cliente diretamente no WhatsApp, com uma mensagem pré-definida contendo o nome do profissional, a profissão e a descrição completa do serviço.

### Regras (somente valem após o pagamento do profissional - status_pagamento == 'pago'):
- [x] 1. O botão só aparece quando o chat está pago (`status_pagamento === 'pago'`)
- [x] 2. A última mensagem da conversa foi enviada pelo **profissional**
- [x] 3. Há mais de **5 minutos** sem resposta do cliente desde a última mensagem

### Tarefas
- [x] 1. Backend (`routes/solicitacoes.js`): endpoint `GET /api/solicitacoes/profissional/:id` agora retorna `ultima_mensagem_data` (timestamp da última mensagem)
- [x] 2. Backend: retorna o flag autoritativo `pode_chamar_whatsapp` (0 ou 1) calculado no MySQL com `TIMESTAMPDIFF(MINUTE, ultima_mensagem_data, NOW()) >= 5` + chat pago + última msg do profissional.
  - **Importante:** a comparação de tempo é feita 100% no MySQL (evita problemas de fuso horário/interpretação de data no navegador que faziam o botão aparecer antes dos 5 minutos).
- [x] 3. Frontend (`public/js/profissional.js`): funções `formatarTelefoneWhatsApp()`, `montarMensagemWhatsApp()` (mensagem estratégica com nome, profissão e descrição), `montarLinkWhatsApp()` (`https://wa.me/...`) e `deveMostrarBotaoWhatsApp()` (usa o flag do backend).
- [x] 4. Frontend: `renderizarSolicitacoes()` renderiza o botão verde "Chamar no Whatsapp" com o ícone oficial do WhatsApp (SVG) quando `pode_chamar_whatsapp === 1`.
- [x] 5. Frontend (`profissional.html`): CSS do botão verde `.btn-whatsapp` (#25D366) e do bloco `.sol-whats-block`.
- [x] 6. Sincronização em tempo real: `widgetVerificarNovasMensagensProf()` re-renderiza a lista a cada 5s quando o flag muda (botão aparece/desaparece automaticamente).

### Correção de bug (5 minutos)
- [x] A lógica de verificação de tempo foi movida do navegador para o MySQL (`TIMESTAMPDIFF`), garantindo que o botão só apareça **após** passarem realmente 5 minutos desde a última mensagem do profissional.

### Registro de chamada WhatsApp
- [ ] 1. (Opcional) Registrar no banco quando o profissional usa o botão (para estatísticas)

## Objetivo 3: Botão "Chamar no Whatsapp" (cliente não responde em 5 min)
Aparece nas solicitações do profissional apenas quando o chat está pago E o cliente não respondeu à última mensagem do profissional há 5+ minutos. Abre o WhatsApp com mensagem estratégica (nome do profissional, profissão e descrição completa do serviço).

### Tarefas
- [x] 1. Backend: rota `GET /api/solicitacoes/profissional/:id` agora retorna `ultima_mensagem_data` (timestamp da última mensagem)
- [x] 2. Frontend (`profissional.js`): funções `formatarTelefoneWhatsApp`, `montarMensagemWhatsApp`, `montarLinkWhatsApp` e `deveMostrarBotaoWhatsApp`
- [x] 3. Botão verde "Chamar no Whatsapp" com ícone oficial do WhatsApp (SVG) renderizado no card da solicitação
- [x] 4. Regra só vale após pagamento (`status_pagamento === 'pago'`) e quando última mensagem foi do profissional há 5+ minutos
- [x] 5. Atualização em tempo real via `widgetVerificarNovasMensagensProf` (re-renderiza a lista)

## Objetivo 4: Redirecionamento após "Enviar Solicitação" (index -> área do cliente)
Ao clicar em "Enviar Solicitação" após preencher os dados, o cliente deve ser direcionado para a área do cliente (aba de solicitações), não permanecer na index.

### Tarefas
- [x] 1. Cliente já logado: após enviar, redireciona para `cliente.html`
- [x] 2. Cliente não logado (cadastro novo OU login existente): após enviar, redireciona para `cliente.html`

# TODO - Botão "Chamar no Whatsapp" (cliente não respondeu há 5+ min)

## Objetivo
Se o cliente não responder no chat em até 5 minutos, o profissional deve ter um botão verde "Chamar no Whatsapp" (com o ícone oficial do WhatsApp) na solicitação, para chamar o cliente diretamente no WhatsApp. Esta regra só vale **após o pagamento** (chat pago).

### Tarefas
- [x] 1. Backend: rota `GET /api/solicitacoes/profissional/:id` agora retorna `ultima_mensagem_data` (timestamp da última mensagem)
- [x] 2. Frontend (`profissional.js`): funções auxiliares `formatarTelefoneWhatsApp`, `montarMensagemWhatsApp`, `montarLinkWhatsApp` e `deveMostrarBotaoWhatsApp` (só aparece se `status_pagamento === 'pago'` + última msg do profissional + >5 min sem resposta)
- [x] 3. Frontend (`profissional.js`): botão verde renderizado no card da solicitação com ícone oficial do WhatsApp
- [x] 4. Frontend (`profissional.html`): CSS do botão `.btn-whatsapp` (verde #25D366) e do bloco `.sol-whats-block`
- [x] 5. Mensagem pré-definida estratégica: contém nome do profissional, profissão e a descrição completa do serviço do cliente
