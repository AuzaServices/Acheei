# TODO - Profissional logado no header do index.html

## Objetivo
Exibir o profissional logado no header do `index.html` (nome, avatar, dropdown "Minha Área" apontando para `profissional.html` e botão Sair), da mesma forma que já acontece para o cliente.

## Tarefas
- [ ] `public/index.html`: tornar o link "Minha Área" do dropdown e do menu mobile dinâmicos (id para o link e texto).
- [ ] `public/index.html`: atualizar o script otimista inline para também considerar o cache do profissional (`acheei_prof_cache` + `acheei_prof_token`).
- [ ] `public/js/main.js`: adicionar funções de cache do profissional (`carregarProfissionalCache`, `salvarProfissionalCache`, `limparProfissionalCache`).
- [ ] `public/js/main.js`: adicionar `verificarLoginProfissional()` (consulta `/api/profissionais/me`).
- [ ] `public/js/main.js`: adicionar `atualizarHeaderProfissional()` e coordenar o header (cliente OU profissional).
- [ ] `public/js/main.js`: criar `sairUsuarioHome()` unificado que limpa token/cache de cliente e profissional.
- [ ] `public/js/main.js`: chamar `verificarLoginProfissional()` no `DOMContentLoaded`.
- [ ] `public/js/profissional.js`: (já pronto) salvar/limpar cache no login, `verificarToken`, logout e 401.
