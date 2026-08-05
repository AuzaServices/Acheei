# TODO - Botão "Compartilhar" e Melhorias de Navegação

## Objetivo
1. Remover emojis do `public/contato.html` e substituí-los pelos ícones SVG do sistema (`public/js/icons.js`).
2. Adicionar botão "Início" no dropdown do Avatar-Nome em `public/cliente.html` (igual à página do profissional).
3. Adicionar botão "Compartilhar" moderno nos cards de profissionais, permitindo compartilhar o link
   do profissional via WhatsApp, Facebook, Twitter/X e copiar link. O link abre o modal com
   nome, profissão, cidade e estado, e botão "Solicitar Serviço".

## Passos
- [x] Analisar projeto (contato.html, cliente.html, index.html, main.js, icons.js, profissionais.js)
- [x] Criar plano e aprovar com o usuário

## Implementação
- [x] contato.html: substituir emojis por ícones SVG (chat, mail, phone, map-pin, check-circle, clock, help-circle)
- [x] cliente.html: remover botão inferior "Início" e mover "Início" para o dropdown do Avatar-Nome
- [x] icons.js: adicionar ícone `share`
- [x] index.html: criar modal `#compartilharModal` (nome, profissão, cidade/estado, Solicitar Serviço, baotoes WhatsApp/Facebook/Twitter/Copiar)
- [x] main.js: adicionar botão "Compartilhar" nos cards; funções abrirCompartilhar, compartilharWhatsApp,
       compartilharFacebook, compartilharTwitter, copiarLinkProfissional; detectar `?profissional=ID` na URL

## Validação
- [ ] Testar botão "Compartilhar" nos cards (modal abre com dados do profissional)
- [ ] Testar link `?profissional=ID` abre o modal ao ser acessado
- [ ] Testar compartilhamento via WhatsApp/Facebook/Twitter e copiar link
- [ ] Testar botão "Solicitar Serviço" dentro do modal de compartilhamento
</content>
