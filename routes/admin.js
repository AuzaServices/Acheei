// ============================================
// Rotas do Painel Administrativo
// ============================================
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dzwkr47ib',
  api_key: '553561859359519',
  api_secret: 'IYJBytc-xlGnFW87Taguno77LDw',
  secure: true
});

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

function getCloudinaryPublicId(url) {
  if (!url || !url.includes('cloudinary')) return null;
  const parts = url.split('/');
  const filename = parts[parts.length - 1].split('.')[0];
  if (url.includes('/perfis/')) return 'acheei/perfis/' + filename;
  if (url.includes('/servicos/')) return 'acheei/servicos/' + filename;
  return 'acheei/' + filename;
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
  // DELETE /api/admin/deletar/:id
  // Deletar profissional do banco e Cloudinary
  // ============================================
  router.delete('/deletar/:id', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    // Primeiro buscar o profissional para pegar URLs das fotos
    db.query('SELECT * FROM profissionais WHERE id = ?', [req.params.id], async (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
      }

      const prof = results[0];
      const erros = [];

      // Extrair public_ids das fotos no Cloudinary
      const publicIds = [];

      // Foto de perfil
      if (prof.foto_perfil && prof.foto_perfil.includes('cloudinary')) {
        const parts = prof.foto_perfil.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder = prof.foto_perfil.includes('/perfis/') ? 'acheei/perfis/' : 'acheei/';
        publicIds.push(folder + filename);
      }

      // Fotos de serviços
      let fotosServicos = [];
      if (prof.fotos_servicos) {
        try { fotosServicos = JSON.parse(prof.fotos_servicos); } catch(e) { fotosServicos = []; }
      }
      fotosServicos.forEach(fotoUrl => {
        if (fotoUrl && fotoUrl.includes('cloudinary')) {
          const parts = fotoUrl.split('/');
          const filename = parts[parts.length - 1].split('.')[0];
          const folder = fotoUrl.includes('/servicos/') ? 'acheei/servicos/' : 'acheei/';
          publicIds.push(folder + filename);
        }
      });

      // Deletar imagens do Cloudinary (em paralelo)
      const deletePromises = publicIds.map(publicId =>
        cloudinary.uploader.destroy(publicId).catch(e => {
          erros.push('Cloudinary: ' + e.message);
        })
      );
      await Promise.all(deletePromises);

      // Deletar solicitações relacionadas
      db.query('DELETE FROM solicitacoes WHERE profissional_id = ?', [req.params.id], (err) => {
        if (err) console.error('Erro ao deletar solicitacoes:', err);
      });

      // Deletar profissional do banco
      db.query('DELETE FROM profissionais WHERE id = ?', [req.params.id], (err, result) => {
        if (err) {
          console.error('Erro ao deletar profissional:', err);
          return res.status(500).json({ success: false, message: 'Erro ao deletar profissional' });
        }

        res.json({
          success: true,
          message: 'Profissional e todas as suas fotos foram deletados permanentemente!',
          erros: erros.length > 0 ? erros : undefined
        });
      });
    });
  });

  // ============================================
  // DELETE /api/admin/profissional/:id/foto-perfil
  // Remover foto de perfil do profissional
  // ============================================
  router.delete('/profissional/:id/foto-perfil', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    db.query('SELECT foto_perfil FROM profissionais WHERE id = ?', [req.params.id], async (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
      }
      const fotoPerfil = results[0].foto_perfil;
      const publicId = getCloudinaryPublicId(fotoPerfil);
      if (publicId) {
        cloudinary.uploader.destroy(publicId).catch((e) => { console.error('Erro Cloudinary:', e.message); });
      }
      db.query('UPDATE profissionais SET foto_perfil = ? WHERE id = ?', ['', req.params.id], (err) => {
        if (err) {
          console.error('Erro ao remover foto de perfil:', err);
          return res.status(500).json({ success: false, message: 'Erro ao remover foto de perfil' });
        }
        res.json({ success: true, message: 'Foto de perfil removida com sucesso' });
      });
    });
  });

  // ============================================
  // DELETE /api/admin/profissional/:id/fotos-servicos/:index
  // Remover foto de serviço do profissional
  // ============================================
  router.delete('/profissional/:id/fotos-servicos/:index', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    const index = parseInt(req.params.index, 10);
    db.query('SELECT fotos_servicos FROM profissionais WHERE id = ?', [req.params.id], async (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
      }
      let fotosServicos = [];
      try {
        fotosServicos = results[0].fotos_servicos ? JSON.parse(results[0].fotos_servicos) : [];
      } catch (e) {
        fotosServicos = [];
      }
      if (isNaN(index) || index < 0 || index >= fotosServicos.length) {
        return res.status(400).json({ success: false, message: 'Foto de serviço inválida' });
      }
      const removedFoto = fotosServicos.splice(index, 1)[0];
      const publicId = getCloudinaryPublicId(removedFoto);
      if (publicId) {
        cloudinary.uploader.destroy(publicId).catch((e) => { console.error('Erro Cloudinary:', e.message); });
      }
      db.query('UPDATE profissionais SET fotos_servicos = ? WHERE id = ?', [JSON.stringify(fotosServicos), req.params.id], (err) => {
        if (err) {
          console.error('Erro ao remover foto de serviço:', err);
          return res.status(500).json({ success: false, message: 'Erro ao remover foto de serviço' });
        }
        res.json({ success: true, message: 'Foto de serviço removida com sucesso' });
      });
    });
  });

// ============================================
  // PUT /api/admin/profissional/:id
  // Atualizar dados do profissional (admin)
  // ============================================
  router.put('/profissional/:id', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }

    const { nome_perfil, endereco, numero, bairro, cidade, estado, cep, data_nascimento } = req.body;

    // Constrói o UPDATE dinamicamente com apenas os campos enviados
    const campos = [];
    const params = [];

    if (nome_perfil !== undefined) { campos.push('nome_perfil = ?'); params.push(nome_perfil); }
    if (endereco !== undefined) { campos.push('endereco = ?'); params.push(endereco); }
    if (numero !== undefined) { campos.push('numero = ?'); params.push(numero); }
    if (bairro !== undefined) { campos.push('bairro = ?'); params.push(bairro); }
    if (cidade !== undefined) { campos.push('cidade = ?'); params.push(cidade); }
    if (estado !== undefined) { campos.push('estado = ?'); params.push(estado.toUpperCase()); }
    if (cep !== undefined) { campos.push('cep = ?'); params.push(cep); }
    if (data_nascimento !== undefined) { campos.push('data_nascimento = ?'); params.push(data_nascimento); }

    if (campos.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
    }

    params.push(req.params.id);
    const sql = 'UPDATE profissionais SET ' + campos.join(', ') + ' WHERE id = ?';

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('Erro ao atualizar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar profissional' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
      }

      res.json({
        success: true,
        message: 'Dados do profissional atualizados com sucesso!'
      });
    });
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

