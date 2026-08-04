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

  function getCloudinaryPublicId(url) {
    if (!url || !url.includes('cloudinary')) return null;
    var cleanUrl = url.split('?')[0];
    var parts = cleanUrl.split('/');
    var filename = parts[parts.length - 1].split('.')[0];
    var folder = 'acheei/';
    if (cleanUrl.includes('/perfis/')) folder = 'acheei/perfis/';
    else if (cleanUrl.includes('/servicos/')) folder = 'acheei/servicos/';
    return folder + filename;
  }

  // ============================================
  // PUT /api/admin/profissional/:id/foto-perfil
  // Remover foto de perfil do profissional
  // ============================================
  router.put('/profissional/:id/foto-perfil', authMiddleware, async (req, res) => {
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

      var fotoPerfil = results[0].foto_perfil;
      if (!fotoPerfil) {
        return res.status(400).json({ success: false, message: 'Nenhuma foto de perfil encontrada' });
      }

      var publicId = getCloudinaryPublicId(fotoPerfil);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId).catch(e => {
          console.error('Erro ao remover foto do Cloudinary:', e);
        });
      }

      db.query('UPDATE profissionais SET foto_perfil = ? WHERE id = ?', ['', req.params.id], (err) => {
        if (err) {
          console.error('Erro ao atualizar profissional:', err);
          return res.status(500).json({ success: false, message: 'Erro ao remover foto de perfil' });
        }

        res.json({ success: true, message: 'Foto de perfil removida com sucesso' });
      });
    });
  });

  // ============================================
  // DELETE /api/admin/profissional/:id/foto-servico/:index
  // Remover foto de serviço do profissional
  // ============================================
  router.delete('/profissional/:id/foto-servico/:index', authMiddleware, async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }

    var index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'Índice de foto inválido' });
    }

    db.query('SELECT fotos_servicos FROM profissionais WHERE id = ?', [req.params.id], async (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
      }

      var fotosServicos = [];
      if (results[0].fotos_servicos) {
        try { fotosServicos = JSON.parse(results[0].fotos_servicos); } catch (e) { fotosServicos = []; }
      }

      if (!Array.isArray(fotosServicos) || index >= fotosServicos.length || !fotosServicos[index]) {
        return res.status(400).json({ success: false, message: 'Foto de serviço não encontrada' });
      }

      var fotoUrl = fotosServicos[index];
      var publicId = getCloudinaryPublicId(fotoUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId).catch(e => {
          console.error('Erro ao remover foto do Cloudinary:', e);
        });
      }

      fotosServicos.splice(index, 1);
      db.query('UPDATE profissionais SET fotos_servicos = ? WHERE id = ?', [JSON.stringify(fotosServicos), req.params.id], (err) => {
        if (err) {
          console.error('Erro ao atualizar profissional:', err);
          return res.status(500).json({ success: false, message: 'Erro ao remover foto de serviço' });
        }

        res.json({ success: true, message: 'Foto de serviço removida com sucesso', data: { fotos_servicos: fotosServicos } });
      });
    });
  });

  // ============================================
  // PUT /api/admin/solicitacoes/:id/aprovar
  // Aprovar solicitação de troca de fotos
  // ============================================
  router.put('/solicitacoes/:id/aprovar', authMiddleware, async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }

    db.query('SELECT * FROM solicitacoes WHERE id = ?', [req.params.id], async (err, results) => {
      if (err) {
        console.error('Erro ao buscar solicitação:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar solicitação' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
      }

      const sol = results[0];
      if (sol.tipo !== 'troca_fotos') {
        return res.status(400).json({ success: false, message: 'Aprovação de troca de fotos só é válida para solicitações de troca de fotos.' });
      }
      if (sol.status_aprovacao !== 'pendente') {
        return res.status(400).json({ success: false, message: 'Esta solicitação já foi respondida.' });
      }

      db.query('SELECT * FROM profissionais WHERE id = ?', [sol.profissional_id], async (err, profResults) => {
        if (err) {
          console.error('Erro ao buscar profissional:', err);
          return res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
        }
        if (profResults.length === 0) {
          return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
        }

        const prof = profResults[0];
        const updates = [];
        const updateParams = [];

        if (sol.foto_perfil_nova) {
          const currentPublicId = getCloudinaryPublicId(prof.foto_perfil);
          if (currentPublicId) {
            await cloudinary.uploader.destroy(currentPublicId).catch(e => {
              console.error('Erro ao remover foto de perfil antiga do Cloudinary:', e);
            });
          }
          updates.push('foto_perfil = ?');
          updateParams.push(sol.foto_perfil_nova);
        }

        if (sol.fotos_servicos_novas) {
          let novasFotos = [];
          try { novasFotos = JSON.parse(sol.fotos_servicos_novas); } catch (e) { novasFotos = []; }
          if (novasFotos.length > 0) {
            const oldFotos = prof.fotos_servicos ? JSON.parse(prof.fotos_servicos) : [];
            oldFotos.forEach(url => {
              const publicId = getCloudinaryPublicId(url);
              if (publicId) {
                cloudinary.uploader.destroy(publicId).catch(e => {
                  console.error('Erro ao remover foto de serviço antiga do Cloudinary:', e);
                });
              }
            });
            updates.push('fotos_servicos = ?');
            updateParams.push(JSON.stringify(novasFotos));
          }
        }

        updates.push('ultima_troca_fotos = NOW()');

        if (updates.length > 0) {
          db.query('UPDATE profissionais SET ' + updates.join(', ') + ' WHERE id = ?', [...updateParams, sol.profissional_id], (err) => {
            if (err) {
              console.error('Erro ao atualizar profissional:', err);
              return res.status(500).json({ success: false, message: 'Erro ao aplicar atualização de fotos' });
            }
            db.query('UPDATE solicitacoes SET status_aprovacao = ?, data_resposta = NOW() WHERE id = ?', ['aprovado', req.params.id], (err) => {
              if (err) {
                console.error('Erro ao atualizar solicitação:', err);
                return res.status(500).json({ success: false, message: 'Erro ao responder solicitação' });
              }
              res.json({ success: true, message: 'Solicitação de troca de fotos aprovada e fotos atualizadas.' });
            });
          });
        } else {
          db.query('UPDATE solicitacoes SET status_aprovacao = ?, data_resposta = NOW() WHERE id = ?', ['aprovado', req.params.id], (err) => {
            if (err) {
              console.error('Erro ao atualizar solicitação:', err);
              return res.status(500).json({ success: false, message: 'Erro ao responder solicitação' });
            }
            res.json({ success: true, message: 'Solicitação aprovada sem alterações de fotos.' });
          });
        }
      });
    });
  });

  // ============================================
  // PUT /api/admin/solicitacoes/:id/rejeitar
  // Rejeitar solicitação de troca de fotos
  // ============================================
  router.put('/solicitacoes/:id/rejeitar', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    db.query('SELECT * FROM solicitacoes WHERE id = ?', [req.params.id], (err, results) => {
      if (err) {
        console.error('Erro ao buscar solicitação:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar solicitação' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
      }
      const sol = results[0];
      if (sol.tipo !== 'troca_fotos') {
        return res.status(400).json({ success: false, message: 'Rejeição só é válida para solicitações de troca de fotos.' });
      }
      if (sol.status_aprovacao !== 'pendente') {
        return res.status(400).json({ success: false, message: 'Esta solicitação já foi respondida.' });
      }
      db.query('UPDATE solicitacoes SET status_aprovacao = ?, data_resposta = NOW() WHERE id = ?', ['rejeitado', req.params.id], (err) => {
        if (err) {
          console.error('Erro ao atualizar solicitação:', err);
          return res.status(500).json({ success: false, message: 'Erro ao rejeitar solicitação' });
        }
        res.json({ success: true, message: 'Solicitação rejeitada com sucesso.' });
      });
    });
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

