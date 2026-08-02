// ============================================
// Rotas de Clientes
// Cadastro, Login, Solicitações, Orçamentos, Chat
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'acheei_secret_key_2024_admin';

module.exports = function(db, dbConnected) {

  // ============================================
  // POST /api/clientes/cadastro
  // Cadastro de cliente
  // ============================================
  router.post('/cadastro', async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { nome, email, senha, telefone } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres' });
    }
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }

    // Verificar se email já existe
    db.query('SELECT id FROM clientes WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Erro ao verificar email:', err);
        return res.status(500).json({ success: false, message: 'Erro ao verificar email' });
      }
      if (results.length > 0) {
        return res.status(400).json({ success: false, message: 'Este email já está cadastrado. Faça login.' });
      }

      bcrypt.hash(senha, 10, (err, senhaHash) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao processar senha' });
        }

        db.query(
          'INSERT INTO clientes (nome, email, senha, telefone) VALUES (?, ?, ?, ?)',
          [nome.trim(), email.trim().toLowerCase(), senhaHash, telefone || ''],
          (err, result) => {
            if (err) {
              console.error('Erro ao cadastrar cliente:', err);
              return res.status(500).json({ success: false, message: 'Erro ao cadastrar cliente' });
            }

            // Gerar token JWT
            const token = jwt.sign(
              { id: result.insertId, email: email.trim().toLowerCase(), nome: nome.trim() },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            res.status(201).json({
              success: true,
              message: 'Cadastro realizado com sucesso!',
              data: {
                token,
                cliente: {
                  id: result.insertId,
                  nome: nome.trim(),
                  email: email.trim().toLowerCase()
                }
              }
            });
          }
        );
      });
    });
  });

  // ============================================
  // POST /api/clientes/login
  // Login do cliente
  // ============================================
  router.post('/login', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }

    db.query('SELECT * FROM clientes WHERE email = ?', [email.trim().toLowerCase()], async (err, results) => {
      if (err) {
        console.error('Erro ao buscar cliente:', err);
        return res.status(500).json({ success: false, message: 'Erro ao autenticar' });
      }
      if (results.length === 0) {
        return res.status(401).json({ success: false, message: 'Email ou senha inválidos' });
      }

      const cliente = results[0];
      try {
        const senhaValida = await bcrypt.compare(senha, cliente.senha);
        if (!senhaValida) {
          return res.status(401).json({ success: false, message: 'Email ou senha inválidos' });
        }

        const token = jwt.sign(
          { id: cliente.id, email: cliente.email, nome: cliente.nome },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          message: 'Login realizado com sucesso!',
          data: {
            token,
            cliente: {
              id: cliente.id,
              nome: cliente.nome,
              email: cliente.email,
              telefone: cliente.telefone
            }
          }
        });
      } catch (err) {
        console.error('Erro ao verificar senha:', err);
        res.status(500).json({ success: false, message: 'Erro ao verificar senha' });
      }
    });
  });

  // ============================================
  // Middleware de autenticação do cliente
  // ============================================
  function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.cliente = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }
  }

  // ============================================
  // GET /api/clientes/me
  // Dados do cliente logado
  // ============================================
  router.get('/me', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query('SELECT id, nome, email, telefone, data_cadastro FROM clientes WHERE id = ?', [req.cliente.id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }
      res.json({ success: true, data: results[0] });
    });
  });

  // ============================================
  // GET /api/clientes/solicitacoes
  // Solicitações do cliente logado
  // ============================================
  router.get('/solicitacoes', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      `SELECT s.*, p.nome_perfil, p.profissao, p.foto_perfil, p.cidade, p.estado
       FROM solicitacoes s
       JOIN profissionais p ON s.profissional_id = p.id
       WHERE s.cliente_id = ?
       ORDER BY s.data_solicitacao DESC`,
      [req.cliente.id],
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
  // GET /api/clientes/orcamentos
  // Orçamentos das solicitações do cliente
  // ============================================
  router.get('/orcamentos', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      `SELECT o.*, p.nome_perfil, p.profissao, p.foto_perfil, s.descricao as descricao_solicitacao
       FROM orcamentos o
       JOIN profissionais p ON o.profissional_id = p.id
       JOIN solicitacoes s ON o.solicitacao_id = s.id
       WHERE s.cliente_id = ?
       ORDER BY o.data_criacao DESC`,
      [req.cliente.id],
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
  // GET /api/clientes/mensagens/:solicitacao_id
  // Mensagens do chat de uma solicitação
  // ============================================
  router.get('/mensagens/:solicitacao_id', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    // Verificar se a solicitação pertence ao cliente
    db.query(
      'SELECT id FROM solicitacoes WHERE id = ? AND cliente_id = ?',
      [req.params.solicitacao_id, req.cliente.id],
      (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
        }
        if (results.length === 0) {
          return res.status(403).json({ success: false, message: 'Solicitação não encontrada ou não pertence a você' });
        }

        db.query(
          'SELECT * FROM mensagens WHERE solicitacao_id = ? ORDER BY data_envio ASC',
          [req.params.solicitacao_id],
          (err, mensagens) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Erro ao buscar mensagens' });
            }
            // Marcar mensagens do profissional como lidas
            db.query(
              'UPDATE mensagens SET lida = TRUE WHERE solicitacao_id = ? AND remetente = "profissional"',
              [req.params.solicitacao_id]
            );
            res.json({ success: true, data: mensagens, total: mensagens.length });
          }
        );
      }
    );
  });

  // ============================================
  // POST /api/clientes/mensagens
  // Enviar mensagem como cliente
  // ============================================
  router.post('/mensagens', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { solicitacao_id, texto } = req.body;
    if (!solicitacao_id || !texto) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: solicitacao_id, texto' });
    }

    // Verificar se a solicitação pertence ao cliente
    db.query(
      'SELECT id FROM solicitacoes WHERE id = ? AND cliente_id = ?',
      [solicitacao_id, req.cliente.id],
      (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
        }
        if (results.length === 0) {
          return res.status(403).json({ success: false, message: 'Solicitação não encontrada ou não pertence a você' });
        }

        db.query(
          'INSERT INTO mensagens (solicitacao_id, remetente, texto) VALUES (?, ?, ?)',
          [solicitacao_id, 'cliente', texto.trim()],
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
    );
  });

  return router;
};
