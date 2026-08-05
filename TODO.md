# TODO - Cabeçalho Mobile (Dropdown Avatar+Nome) nas Áreas Cliente/Profissional

## Objetivo
Focar no mobile, tornando as áreas do cliente e do profissional 100% responsivas.
Padronizar o cabeçalho com o dropdown de Avatar + Nome + seta (padrão do index.html),
contendo "Sair" e "Configurações" (profissional) ou apenas "Sair" (cliente).

## Passos
- [x] Analisar projeto (cliente.html/js, profissional.html/js, index.html/js, style.css)
- [x] Criar plano e aprovar com o usuário

## Implementação
- [ ] cliente.html: substituir cabeçalho por dropdown Avatar+Nome+Seta (apenas "Sair")
- [ ] cliente.js: adicionar setupUserDropdown + popular avatar + chamar no DOMContentLoaded
- [ ] profissional.html: substituir cabeçalho por dropdown Avatar+Nome+Seta (Configurações + Sair)
- [ ] profissional.js: adicionar setupUserDropdown + popular avatar + chamar no DOMContentLoaded
- [ ] style.css: estilizar dropdown no cabeçalho do dashboard (mobile e desktop)

## Validação
- [ ] Testar em mobile (DevTools)
- [ ] Testar em desktop
