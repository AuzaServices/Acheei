aywy6// ============================================
// Rotas de Solicitações
// ============================================
const express = require('express');
const router = express.Router();

module.exports = function(db, dbConnected) {

  // ============================================
  // POST /api/solicitacoes
  // Cliente solicita serviço a um profissional
  // ============================================
router.post('/', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
const { cliente_nome, cliente_telefone, descricao, profissional_id, cliente_id, data_hora, urgencia, orcamento_estimado } = req.body;

    if (!descricao || !profissional_id) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: descrição e profissional'
      });
    }

    // Função auxiliar para validar o profissional e inserir a solicitação
    function inserirSolicitacao(nomeFinal, telefoneFinal, clienteIdFinal) {
      if (!nomeFinal || nomeFinal.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'O nome do cliente deve ter pelo menos 3 caracteres'
        });
      }
      db.query(
        "SELECT id, nome_perfil, profissao FROM profissionais WHERE id = ? AND status_aprovacao = 'aprovado'",
        [profissional_id],
        (err, profResults) => {
          if (err) {
            console.error('Erro ao verificar profissional:', err);
            return res.status(500).json({ success: false, message: 'Erro ao verificar profissional' });
          }
          if (profResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Profissional não encontrado ou não está disponível' });
          }

          // Sanitiza e envia dados no formato esperado
          var dadosExtras = {};
          if (data_hora) dadosExtras.data_hora = new Date(data_hora);
          if (urgencia) dadosExtras.urgencia = String(urgencia).trim();
          if (orcamento_estimado) dadosExtras.orcamento_estimado = String(orcamento_estimado).trim();

          db.query(
            'INSERT INTO solicitacoes (cliente_nome, cliente_telefone, descricao, profissional_id, cliente_id, data_hora, urgencia, orcamento_estimado, status_pagamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [(nomeFinal || '').trim(), (telefoneFinal || '').trim(), (descricao || '').trim(), profissional_id, clienteIdFinal || null, dadosExtras.data_hora || null, dadosExtras.urgencia || null, dadosExtras.orcamento_estimado || null, 'pendente'],
            (err, result) => {
              if (err) {
                console.error('Erro ao criar solicitação:', err);
                return res.status(500).json({ success: false, message: 'Erro ao enviar solicitação' });
              }
              res.status(201).json({
                success: true,
                message: `Solicitação enviada com sucesso para ${profResults[0].nome_perfil}!`,
                data: {
                  id: result.insertId,
                  profissional: profResults[0].nome_perfil,
                  profissional_id: profissional_id
                }
              });
            }
          );
        }
      );
    }

    // Se o cliente está logado (enviou cliente_id), busca nome/telefone do banco
    if (cliente_id) {
      db.query(
        'SELECT id, nome, email, telefone FROM clientes WHERE id = ?',
        [cliente_id],
        (err, clienteResults) => {
          if (err) {
            console.error('Erro ao buscar cliente:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar dados do cliente' });
          }
          if (clienteResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
          }
          const c = clienteResults[0];
          inserirSolicitacao(c.nome, c.telefone || '', cliente_id);
        }
      );
      return;
    }

    // Cliente não logado: usa dados enviados no formulário
    if (!cliente_nome || !cliente_telefone) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: nome e telefone do cliente'
      });
    }
    inserirSolicitacao(cliente_nome, cliente_telefone, null);
  });

  // ============================================
  // GET /api/solicitacoes/profissional/:id
  // Listar solicitações de um profissional (com status de pagamento)
  // ============================================
  router.get('/profissional/:id', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
db.query(
`SELECT s.*,
        (SELECT COUNT(*) FROM mensagens m WHERE m.solicitacao_id = s.id AND m.remetente = 'cliente' AND m.lida = FALSE) AS qtd_nao_lidas,
        (SELECT m.texto FROM mensagens m WHERE m.solicitacao_id = s.id ORDER BY m.data_envio DESC, m.id DESC LIMIT 1) AS ultima_mensagem,
        (SELECT m.remetente FROM mensagens m WHERE m.solicitacao_id = s.id ORDER BY m.data_envio DESC, m.id DESC LIMIT 1) AS ultima_mensagem_remetente,
        (SELECT m.data_envio FROM mensagens m WHERE m.solicitacao_id = s.id ORDER BY m.data_envio DESC, m.id DESC LIMIT 1) AS ultima_mensagem_data,
(CASE
          WHEN s.status_pagamento = 'pago'
           AND (SELECT MAX(m.data_envio) FROM mensagens m WHERE m.solicitacao_id = s.id AND m.remetente = 'profissional') IS NOT NULL
           AND TIMESTAMPDIFF(MINUTE, (SELECT MAX(m.data_envio) FROM mensagens m WHERE m.solicitacao_id = s.id AND m.remetente = 'profissional'), NOW()) >= 5
          THEN 1
          ELSE 0
        END) AS pode_chamar_whatsapp
       FROM solicitacoes s
       WHERE s.profissional_id = ?
       ORDER BY s.data_solicitacao DESC`,
      [req.params.id],
      (err, results) => {
        if (err) {
          console.error('Erro ao buscar solicitações:', err);
          return res.status(500).json({ success: false, message: 'Erro ao buscar solicitações' });
        }
        res.json({ success: true, data: results, total: results.length });
      }
    );
  });

// ============================================
  // PUT /api/solicitacoes/:id/pagar
  // DESATIVADO: este endpoint liberava o chat sem verificar o pagamento real.
  // O chat agora SÓ é liberado após confirmação do Mercado Pago (POST /api/pagamento/confirmar
  // ou verificação em /api/pagamento/verificar/:id).
  // ============================================
  router.put('/:id/pagar', (req, res) => {
    return res.status(403).json({
      success: false,
      message: 'Pagamento não pode ser confirmado por este método. Realize o pagamento via Mercado Pago para liberar o chat.'
    });
  });

// ============================================
  // DELETE /api/solicitacoes/:id/rejeitar
  // Profissional rejeita uma solicitação.
  // Apaga a solicitação e incrementa o contador de rejeições do profissional,
  // o que reduz seu ranking nas buscas públicas.
  // ============================================
  router.delete('/:id/rejeitar', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      'SELECT profissional_id FROM solicitacoes WHERE id = ?',
      [req.params.id],
      (err, results) => {
        if (err) {
          console.error('Erro ao buscar solicitação para rejeitar:', err);
          return res.status(500).json({ success: false, message: 'Erro ao rejeitar solicitação' });
        }
        if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        const profissionalId = results[0].profissional_id;

        // Apaga a solicitação (mensagens e orçamentos associados são removidos em cascata)
        db.query(
          'DELETE FROM solicitacoes WHERE id = ?',
          [req.params.id],
          (err, delResult) => {
            if (err) {
              console.error('Erro ao excluir solicitação:', err);
              return res.status(500).json({ success: false, message: 'Erro ao excluir solicitação' });
            }
            // Incrementa o contador de rejeições do profissional
            db.query(
              'UPDATE profissionais SET rejeicoes = rejeicoes + 1 WHERE id = ?',
              [profissionalId],
              (err2) => {
                if (err2) {
                  console.error('Erro ao atualizar rejeições:', err2);
                  return res.status(500).json({ success: false, message: 'Solicitação excluída, mas erro ao atualizar pontuação' });
                }
                res.json({
                  success: true,
                  message: 'Solicitação rejeitada e excluída. Isso afetará sua posição nas buscas.',
                  data: { solicitacao_id: req.params.id, rejeicoes_incrementadas: true }
                });
              }
            );
          }
        );
      }
    );
  });

  // ============================================
  // GET /api/solicitacoes
  // Listar todas as solicitações (admin)
  // ============================================
  router.get('/', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      `SELECT s.*, p.nome_perfil, p.profissao,
        a.nota AS avaliacao_nota, a.respeito AS avaliacao_respeito,
        a.comprometimento AS avaliacao_comprometimento, a.qualidade AS avaliacao_qualidade,
        a.data_avaliacao
       FROM solicitacoes s 
       JOIN profissionais p ON s.profissional_id = p.id 
       LEFT JOIN avaliacoes a ON a.solicitacao_id = s.id
       ORDER BY s.data_solicitacao DESC`,
      (err, results) => {
        if (err) {
          console.error('Erro ao buscar solicitações:', err);
          return res.status(500).json({ success: false, message: 'Erro ao buscar solicitações' });
        }
        res.json({ success: true, data: results, total: results.length });
      }
    );
  });

  return router;
};
