# TODO - Implementação de Geolocalização Automática

## Objetivo
Quando o usuário entrar no site, pedir a geolocalização para preencher automaticamente
Cidade e Estado nos campos de busca de serviço do index.html.

## Passos
- [x] Analisar o projeto (index.html, main.js, server.js, package.json)
- [x] Criar o plano e aprovar com o usuário

## Implementação
- [x] Adicionar função de geolocalização + reverse geocoding em `public/js/main.js`
- [x] Chamar a função no carregamento da página (DOMContentLoaded)

## Validação
- [ ] Testar permissão concedida (campos preenchidos)
- [ ] Testar permissão negada (campos vazios, sem erro)
- [ ] Testar falha de reverse geocoding (campos vazios)
