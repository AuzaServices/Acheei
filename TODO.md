# TODO - Novos campos na Solicitação + Som Chiclete

1. [x] Adicionar colunas `data_hora`, `urgencia`, `orcamento_estimado` em `database/schema.sql` + ALTERs
2. [x] Adicionar os 4 inputs opcionais acima de "Descreva o Serviço" em `public/index.html`
3. [x] Incluir os novos campos no payload em `public/js/main.js` (enviarSolicitacao)
4. [x] Limpar sanitização da `urgencia` em `routes/solicitacoes.js`
5. [x] Exibir os campos na área do profissional (`public/js/profissional.js`)
6. [x] Exibir os campos na área do admin (`public/js/painel.js`)
7. [x] Adicionar som chiclete para novas mensagens em `public/js/cliente.js` e `public/js/profissional.js`
8. [x] Estilos dos novos campos em `public/css/style.css`

## Pendente (banco de dados)
- [ ] Executar no banco MySQL existente:
  ```sql
  ALTER TABLE solicitacoes
    ADD COLUMN data_hora DATETIME NULL,
    ADD COLUMN urgencia VARCHAR(50) NULL,
    ADD COLUMN orcamento_estimado VARCHAR(100) NULL;
  ```
</content>

