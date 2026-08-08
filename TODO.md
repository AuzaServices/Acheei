# TODO - Rejeição de Solicitação no Profissional

## Objetivo
Permitir que o profissional rejeite solicitações. Ao rejeitar, a solicitação é excluída e o contador de rejeições aumenta, reduzindo seu ranking nas buscas públicas.

## Tarefas
- [x] 1. Adicionar campo `rejeicoes INT DEFAULT 0` na tabela `profissionais` (schema.sql)
- [x] 2. Criar endpoint DELETE /api/solicitacoes/:id/rejeitar (apaga solicitação + incrementa rejeicoes)
- [x] 3. Penalizar ranking no routes/profissionais.js (ORDER BY subtrai 0.5 por rejeição)
- [x] 4. Adicionar ícone X SVG vermelho no canto superior direito da solicitação (profissional.html + profissional.js)
- [x] 5. Criar modal de alerta de rejeição (influencia na pontuação)
- [x] 6. Substituir botão "Pagar R$14,99" no mobile por botão de arrastar para o lado
- [x] 7. Manter botão de pagar no desktop
- [ ] 8. Executar o ALTER TABLE no banco para adicionar a coluna `rejeicoes` (em bancos já existentes)
- [ ] 9. Testar fluxo completo
