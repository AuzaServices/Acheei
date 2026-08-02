// ============================================
// Rotas do Painel Administrativo
// ============================================
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação não fornecido'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'acheei_secret_key_2024_admin');
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
}

module.exports = function(db, dbConnected) {

  // ============================================
  // POST /api/admin/login
  // Autenticação do administrador
  // ============================================
  router.post('/login', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Usuário e senha são obrigatórios'
      });
    }

    db.query(
      'SELECT * FROM admin WHERE usuario = ?',
      [usuario],
      async (err, results) => {
        if (err) {
          console.error('Erro ao buscar admin:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao autenticar'
          });
        }

        if (results.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'Usuário ou senha inválidos'
          });
        }

        const admin = results[0];

        try {
          const senhaValida = await bcrypt.compare(senha, admin.senha);
          
          if (!senhaValida) {
            return res.status(401).json({
              success: false,
              message: 'Usuário ou senha inválidos'
            });
          }

          const token = jwt.sign(
            { id: admin.id, usuario: admin.usuario },
            process.env.JWT_SECRET || 'acheei_secret_key_2024_admin',
            { expiresIn: '24h' }
          );

          res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
              token,
              usuario: admin.usuario,
              expiresIn: '24h'
            }
          });
        } catch (err) {
          console.error('Erro ao verificar senha:', err);
          res.status(500).json({
            success: false,
            message: 'Erro ao verificar senha'
          });
        }
      }
    );
  });

  // ============================================
  // GET /api/admin/verificar
  // Verificar se token é válido
  // ============================================
  router.get('/verificar', authMiddleware, (req, res) => {
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        usuario: req.admin.usuario
      }
    });
  });

  // ============================================
  // PUT /api/admin/aprovar/:id
  // Aprovar profissional
  // ============================================
  router.put('/aprovar/:id', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    db.query(
      "UPDATE profissionais SET status_aprovacao = 'aprovado' WHERE id = ?",
      [req.params.id],
      (err, result) => {
        if (err) {
          console.error('Erro ao aprovar profissional:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao aprovar profissional'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Profissional não encontrado'
          });
        }

        res.json({
          success: true,
          message: 'Profissional aprovado com sucesso!'
        });
      }
    );
  });

  // ============================================
  // PUT /api/admin/reprovar/:id
  // Reprovar profissional
  // ============================================
  router.put('/reprovar/:id', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    db.query(
      "UPDATE profissionais SET status_aprovacao = 'reprovado' WHERE id = ?",
      [req.params.id],
      (err, result) => {
        if (err) {
          console.error('Erro ao reprovar profissional:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao reprovar profissional'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Profissional não encontrado'
          });
        }

        res.json({
          success: true,
          message: 'Profissional reprovado!'
        });
      }
    );
  });

  // ============================================
  // POST /api/admin/criar
  // Criar novo administrador (protegido)
  // ============================================
  router.post('/criar', authMiddleware, async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Usuário e senha são obrigatórios'
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(senha, 10);
      
      db.query(
        'INSERT INTO admin (usuario, senha) VALUES (?, ?)',
        [usuario, hashedPassword],
        (err, result) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({
                success: false,
                message: 'Este usuário já existe'
              });
            }
            console.error('Erro ao criar admin:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao criar administrador'
            });
          }

          res.status(201).json({
            success: true,
            message: 'Administrador criado com sucesso'
          });
        }
      );
    } catch (err) {
      console.error('Erro ao criar hash:', err);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar senha'
      });
    }
  });

  return router;
};

