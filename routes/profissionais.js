// ============================================
// Rotas de Profissionais
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

module.exports = function(db, dbConnected) {

// Dados mockados para quando MySQL nao estiver disponivel
  var mockProfissionais = [];

  // ============================================
  // GET /api/profissionais
  // Listar profissionais aprovados (público)
  // ============================================
  router.get('/', function(req, res) {
    if (!dbConnected()) {
      return res.json({ success: true, data: mockProfissionais, total: mockProfissionais.length });
    }
    var cidade = req.query.cidade;
    var estado = req.query.estado;
    var profissao = req.query.profissao;
    
    var sql = "SELECT * FROM profissionais WHERE status_aprovacao = 'aprovado'";
    var params = [];

    if (cidade) { sql += ' AND cidade LIKE ?'; params.push('%' + cidade + '%'); }
    if (estado) { sql += ' AND estado = ?'; params.push(estado.toUpperCase()); }
    if (profissao) { sql += ' AND profissao LIKE ?'; params.push('%' + profissao + '%'); }

    sql += ' ORDER BY data_cadastro DESC';

    db.query(sql, params, function(err, results) {
      if (err) {
        console.error('Erro ao buscar profissionais:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar profissionais' });
      }
      var profissionais = results.map(function(prof) {
        return {
          id: prof.id, cpf: prof.cpf, data_nascimento: prof.data_nascimento,
          endereco: prof.endereco, numero: prof.numero, bairro: prof.bairro,
          cidade: prof.cidade, estado: prof.estado, cep: prof.cep,
          nome_perfil: prof.nome_perfil, foto_perfil: prof.foto_perfil,
          profissao: prof.profissao,
          fotos_servicos: prof.fotos_servicos ? JSON.parse(prof.fotos_servicos) : [],
          status_aprovacao: prof.status_aprovacao, data_cadastro: prof.data_cadastro
        };
      });
      res.json({ success: true, data: profissionais, total: profissionais.length });
    });
  });

  // ============================================
  // GET /api/profissionais/todas
  // Listar todas os profissionais (admin)
  // ============================================
  router.get('/todas', (req, res) => {
    if (!dbConnected()) {
      return res.json({ success: true, data: [], message: 'Banco de dados indisponível' });
    }
    db.query('SELECT * FROM profissionais ORDER BY data_cadastro DESC', (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissionais:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar profissionais'
        });
      }

      const profissionais = results.map(prof => ({
        ...prof,
        fotos_servicos: prof.fotos_servicos ? JSON.parse(prof.fotos_servicos) : []
      }));

      res.json({
        success: true,
        data: profissionais
      });
    });
  });

  // ============================================
  // GET /api/profissionais/categorias
  // Listar categorias únicas (para autocomplete)
  // ============================================
  router.get('/categorias', (req, res) => {
    if (!dbConnected()) {
      return res.json({ success: true, data: [] });
    }
    db.query(
      "SELECT DISTINCT profissao FROM profissionais WHERE status_aprovacao = 'aprovado' ORDER BY profissao",
      (err, results) => {
        if (err) {
          console.error('Erro ao buscar categorias:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar categorias'
          });
        }
        res.json({
          success: true,
          data: results.map(r => r.profissao)
        });
      }
    );
  });

  // ============================================
  // GET /api/profissionais/:id
  // Buscar profissional por ID
  // ============================================
  router.get('/:id', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      'SELECT * FROM profissionais WHERE id = ?',
      [req.params.id],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar profissional'
          });
        }
        if (results.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Profissional não encontrado'
          });
        }

        const profissional = {
          ...results[0],
          fotos_servicos: results[0].fotos_servicos ? JSON.parse(results[0].fotos_servicos) : []
        };

        res.json({
          success: true,
          data: profissional
        });
      }
    );
  });

  // ============================================
  // POST /api/profissionais
  // Cadastro de profissional (3 etapas)
  // ============================================
  router.post('/', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }
    const {
      cpf,
      data_nascimento,
      endereco,
      numero,
      bairro,
      cidade,
      estado,
      cep,
      nome_perfil,
      foto_perfil,
      profissao,
      fotos_servicos
    } = req.body;

    // Validações básicas
    if (!cpf || !data_nascimento || !endereco || !bairro || !cidade || !estado || !cep || !nome_perfil || !profissao) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos obrigatórios devem ser preenchidos'
      });
    }

    // Verificar se CPF já existe
    db.query('SELECT id FROM profissionais WHERE cpf = ?', [cpf], (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao verificar CPF'
        });
      }
      if (results.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'CPF já cadastrado no sistema'
        });
      }

      // Inserir profissional
      const fotosServicosStr = fotos_servicos ? JSON.stringify(fotos_servicos) : '[]';

      db.query(
        `INSERT INTO profissionais 
        (cpf, data_nascimento, endereco, numero, bairro, cidade, estado, cep, nome_perfil, foto_perfil, profissao, fotos_servicos, status_aprovacao) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
        [cpf, data_nascimento, endereco, numero || '', bairro, cidade, estado.toUpperCase(), cep, nome_perfil, foto_perfil || '', profissao, fotosServicosStr],
        (err, result) => {
          if (err) {
            console.error('Erro ao cadastrar profissional:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao cadastrar profissional'
            });
          }

          res.status(201).json({
            success: true,
            message: 'Cadastro realizado com sucesso! Seu perfil será analisado pelo administrador.',
            data: { id: result.insertId }
          });
        }
      );
    });
  });

  return router;
};

