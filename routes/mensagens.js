// ============================================
// Rotas de Mensagens (Chat)
// ============================================
const express = require('express');
const router = express.Router();
const { notificarCliente } = require('../config/push');

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
      'SELECT status_pagamento FROM solicitacoes WHERE id = ?',
      [req.params.solicitacao_id],
      (err, solResults) => {
        if (err) {
          console.error('Erro ao verificar solicitação:', err);
          return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
        }
        if (solResults.length === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        if (solResults[0].status_pagamento !== 'pago') {
          return res.status(403).json({
            success: false,
            message: 'O chat só é liberado após o pagamento de R$14,99 ser confirmado.'
          });
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

        // Se mensagem foi do profissional, enviar notificação push para o cliente
        if (remetente === 'profissional') {
          // Buscar dados do profissional e do cliente para a notificação
          db.query(
            `SELECT s.cliente_id, s.cliente_nome, p.nome_perfil, p.profissao
             FROM solicitacoes s
             LEFT JOIN profissionais p ON s.profissional_id = p.id
             WHERE s.id = ?`,
            [solicitacao_id],
            (err2, solResults) => {
              if (!err2 && solResults.length > 0 && solResults[0].cliente_id) {
                const sol = solResults[0];
                const textoCurto = texto.trim().substring(0, 100) + (texto.trim().length > 100 ? '...' : '');
                const payload = {
                  title: `💬 ${sol.nome_perfil} (${sol.profissao})`,
                  body: textoCurto,
                  tag: `chat_${solicitacao_id}`,
                  url: `/cliente.html?chat=${solicitacao_id}`,
                  solicitacao_id: solicitacao_id
                };
                notificarCliente(db, sol.cliente_id, payload).catch(() => {});
              }
            }
          );
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
