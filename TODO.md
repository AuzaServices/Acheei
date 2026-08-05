# TODO - Torne a foto de perfil do cadastro obrigatória

## Objetivo
Tornar obrigatória a foto de perfil no cadastro de profissional.

## Implementação
- [x] `public/cadastro.html`: Adicionar marcador de obrigatório `*` no label e mensagem de erro
- [x] `public/js/cadastro.js`: Validar foto de perfil no passo 3 e limpar erro ao adicionar a foto
- [x] `routes/profissionais.js`: Validar foto de perfil no backend

## Validação
- [ ] Testar cadastro sem foto (deve bloquear e mostrar erro no passo 3)
- [ ] Testar cadastro com foto (deve passar)
- [ ] Testar envio direto à API sem foto (deve retornar erro)
