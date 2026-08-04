// ============================================
// Rotas de Solicitações
// ============================================
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'acheei_secret_key_2024_admin';

function getTokenFromHeader(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch (e) { return []; }
}

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
  // POST /api/solicitacoes/troca-fotos
  // Profissional solicita troca de fotos ao admin
  // ============================================
  router.post('/troca-fotos', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }

    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }

    const profissionalId = decoded.id;
    const { foto_perfil_nova, fotos_servicos_novas, motivo_troca } = req.body;
    const fotosServicosNovas = parseJsonArray(fotos_servicos_novas);

    if ((!foto_perfil_nova || !foto_perfil_nova.trim()) && fotosServicosNovas.length === 0) {
      return res.status(400).json({ success: false, message: 'Selecione pelo menos uma nova foto de perfil ou serviço.' });
    }
    if (!motivo_troca || !motivo_troca.trim()) {
      return res.status(400).json({ success: false, message: 'Informe um motivo para a troca de fotos.' });
    }

    db.query('SELECT * FROM profissionais WHERE id = ? AND status_aprovacao = "aprovado"', [profissionalId], (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao verificar profissional' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado ou não aprovado' });
      }

      const prof = results[0];
      if (prof.ultima_troca_fotos) {
        const lastDate = new Date(prof.ultima_troca_fotos);
        const nextAllowed = new Date(lastDate.getTime());
        nextAllowed.setMonth(nextAllowed.getMonth() + 1);
        if (new Date() < nextAllowed) {
          return res.status(400).json({ success: false, message: 'Você só pode solicitar troca de fotos novamente em ' + nextAllowed.toLocaleDateString('pt-BR') + '.' });
        }
      }

      db.query(
        'INSERT INTO solicitacoes (cliente_nome, cliente_telefone, descricao, profissional_id, cliente_id, status_pagamento, tipo, status_aprovacao, foto_perfil_nova, fotos_servicos_novas, motivo_troca) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          prof.nome_perfil + ' (troca de fotos)',
          '',
          motivo_troca.trim(),
          profissionalId,
          null,
          'pendente',
          'troca_fotos',
          'pendente',
          foto_perfil_nova || '',
          JSON.stringify(fotosServicosNovas),
          motivo_troca.trim()
        ],
        (err, result) => {
          if (err) {
            console.error('Erro ao criar solicitação de troca de fotos:', err);
            return res.status(500).json({ success: false, message: 'Erro ao criar solicitação' });
          }
          res.status(201).json({
            success: true,
            message: 'Solicitação de troca de fotos enviada com sucesso.',
            data: { id: result.insertId }
          });
        }
      );
    });
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
  // Marcar solicitação como paga (R$14,99)
  // ============================================
  router.put('/:id/pagar', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      'UPDATE solicitacoes SET status_pagamento = "pago" WHERE id = ?',
      [req.params.id],
      (err, result) => {
        if (err) {
          console.error('Erro ao processar pagamento:', err);
          return res.status(500).json({ success: false, message: 'Erro ao processar pagamento' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        res.json({
          success: true,
          message: 'Pagamento realizado com sucesso! O chat com o cliente foi liberado.',
          data: { id: parseInt(req.params.id), status_pagamento: 'pago' }
        });
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
