// ============================================
// Rotas de Mensagens (Chat)
// ============================================
const express = require('express');
const router = express.Router();

module.exports = function(db, dbConnected) {

  // ============================================
  // GET /api/mensagens/:solicitacao_id
  // Listar mensagens de uma solicitação (chat)
  // ============================================
  router.get('/:solicitacao_id', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      'SELECT * FROM mensagens WHERE solicitacao_id = ? ORDER BY data_envio ASC',
      [req.params.solicitacao_id],
      (err, results) => {
        if (err) {
          console.error('Erro ao buscar mensagens:', err);
          return res.status(500).json({ success: false, message: 'Erro ao buscar mensagens' });
        }
        // Marcar como lidas
        db.query(
          'UPDATE mensagens SET lida = TRUE WHERE solicitacao_id = ? AND remetente != "profissional"',
          [req.params.solicitacao_id]
        );
        res.json({ success: true, data: results, total: results.length });
      }
    );
  });

  // ============================================
  // POST /api/mensagens
  // Enviar mensagem
  // ============================================
  router.post('/', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { solicitacao_id, remetente, texto } = req.body;
    if (!solicitacao_id || !remetente || !texto) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: solicitacao_id, remetente, texto' });
    }
    if (remetente === 'profissional') {
      // Verificar se o pagamento foi feito para liberar o chat do profissional
      db.query(
        'SELECT status_pagamento FROM solicitacoes WHERE id = ?',
        [solicitacao_id],
        (err, results) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
          }
          if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
          }
          if (results[0].status_pagamento !== 'pago') {
            return res.status(403).json({
              success: false,
              message: 'O chat com o cliente só é liberado após o pagamento de R$14,99. Vá até a aba "Solicitações" para realizar o pagamento.'
            });
          }
          enviarMensagem(res, solicitacao_id, remetente, texto);
        }
      );
    } else {
      enviarMensagem(res, solicitacao_id, remetente, texto);
    }
  });

  function enviarMensagem(res, solicitacao_id, remetente, texto) {
    db.query(
      'INSERT INTO mensagens (solicitacao_id, remetente, texto) VALUES (?, ?, ?)',
      [solicitacao_id, remetente, texto.trim()],
      (err, result) => {
        if (err) {
          console.error('Erro ao enviar mensagem:', err);
          return res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
        }
        res.status(201).json({
          success: true,
          message: 'Mensagem enviada!',
          data: { id: result.insertId, data_envio: new Date().toISOString() }
        });
      }
    );
  }

  return router;
};
