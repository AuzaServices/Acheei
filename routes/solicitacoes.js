// ============================================
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
    const { cliente_nome, cliente_telefone, descricao, profissional_id, cliente_id } = req.body;

    if (!cliente_nome || !cliente_telefone || !descricao || !profissional_id) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios: nome, telefone, descrição e profissional'
      });
    }

    if (cliente_nome.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'O nome deve ter pelo menos 3 caracteres'
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

        db.query(
          'INSERT INTO solicitacoes (cliente_nome, cliente_telefone, descricao, profissional_id, cliente_id, status_pagamento) VALUES (?, ?, ?, ?, ?, ?)',
          [cliente_nome.trim(), cliente_telefone.trim(), descricao.trim(), profissional_id, cliente_id || null, 'pendente'],
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
      'SELECT * FROM solicitacoes WHERE profissional_id = ? ORDER BY data_solicitacao DESC',
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
  // GET /api/solicitacoes
  // Listar todas as solicitações (admin)
  // ============================================
  router.get('/', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      `SELECT s.*, p.nome_perfil, p.profissao 
       FROM solicitacoes s 
       JOIN profissionais p ON s.profissional_id = p.id 
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
