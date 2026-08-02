// ============================================
// Rotas de Orçamentos
// ============================================
const express = require('express');
const router = express.Router();

module.exports = function(db, dbConnected) {

  // ============================================
  // GET /api/orcamentos/:profissional_id
  // Listar orçamentos de um profissional
  // ============================================
  router.get('/:profissional_id', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      'SELECT * FROM orcamentos WHERE profissional_id = ? ORDER BY data_criacao DESC',
      [req.params.profissional_id],
      (err, results) => {
        if (err) {
          console.error('Erro ao buscar orçamentos:', err);
          return res.status(500).json({ success: false, message: 'Erro ao buscar orçamentos' });
        }
        res.json({ success: true, data: results, total: results.length });
      }
    );
  });

  // ============================================
  // POST /api/orcamentos
  // Criar novo orçamento
  // ============================================
  router.post('/', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { profissional_id, solicitacao_id, cliente_nome, descricao, valor } = req.body;
    if (!profissional_id || !cliente_nome || !descricao || !valor) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: profissional_id, cliente_nome, descricao, valor' });
    }
    db.query(
      'INSERT INTO orcamentos (profissional_id, solicitacao_id, cliente_nome, descricao, valor) VALUES (?, ?, ?, ?, ?)',
      [profissional_id, solicitacao_id || null, cliente_nome, descricao, valor],
      (err, result) => {
        if (err) {
          console.error('Erro ao criar orçamento:', err);
          return res.status(500).json({ success: false, message: 'Erro ao criar orçamento' });
        }
        res.status(201).json({
          success: true,
          message: 'Orçamento criado com sucesso!',
          data: { id: result.insertId }
        });
      }
    );
  });

  // ============================================
  // DELETE /api/orcamentos/:id
  // Excluir orçamento
  // ============================================
  router.delete('/:id', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query('DELETE FROM orcamentos WHERE id = ?', [req.params.id], (err, result) => {
      if (err) {
        console.error('Erro ao excluir orçamento:', err);
        return res.status(500).json({ success: false, message: 'Erro ao excluir orçamento' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
      }
      res.json({ success: true, message: 'Orçamento excluído com sucesso' });
    });
  });

  return router;
};
