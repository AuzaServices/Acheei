// ============================================
// Rotas de Profissionais
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'acheei_secret_key_2024_admin';

module.exports = function(db, dbConnected) {

  // ============================================
  // GET /api/profissionais
  // Listar profissionais aprovados (público)
  // ============================================
  router.get('/', function(req, res) {
    if (!dbConnected()) {
      return res.json({ success: true, data: [], total: 0 });
    }
    var cidade = req.query.cidade;
    var estado = req.query.estado;
    var profissao = req.query.profissao;
    
    var sql = 'SELECT * FROM profissionais WHERE status_aprovacao = "aprovado"';
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
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query('SELECT * FROM profissionais ORDER BY data_cadastro DESC', (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissionais:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar profissionais' });
      }
      const profissionais = results.map(prof => ({
        ...prof,
        fotos_servicos: prof.fotos_servicos ? JSON.parse(prof.fotos_servicos) : []
      }));
      res.json({ success: true, data: profissionais });
    });
  });

  // ============================================
  // GET /api/profissionais/categorias
  // Listar categorias (para autocomplete)
  // ============================================
  router.get('/categorias', (req, res) => {
    var categoriasFixas = [
      'Eletricista', 'Pedreiro', 'Encanador', 'Pintor', 'Marceneiro',
      'Jardineiro', 'Diarista', 'Mecânico', 'Chaveiro', 'Técnico em TI',
      'Personal Trainer', 'Fotógrafo', 'Cozinheiro', 'Motorista',
      'Babá', 'Cuidador de Idosos', 'Segurança', 'Advogado',
      'Contador', 'Arquiteto', 'Designer de Interiores', 'Professor Particular',
      'Cabeleireiro', 'Manicure', 'Massagista', 'Técnico em Ar Condicionado'
    ];
    if (!dbConnected()) {
      return res.json({ success: true, data: categoriasFixas });
    }
    db.query(
      'SELECT DISTINCT profissao FROM profissionais WHERE status_aprovacao = "aprovado" ORDER BY profissao',
      (err, results) => {
        if (err) {
          return res.json({ success: true, data: categoriasFixas });
        }
        var dbCategorias = results.map(r => r.profissao);
        var todas = [...new Set([...categoriasFixas, ...dbCategorias])].sort();
        res.json({ success: true, data: todas });
      }
    );
  });

  // ============================================
  // POST /api/profissionais/login
  // Login do profissional (retorna JWT)
  // ============================================
  router.post('/login', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }
    db.query('SELECT * FROM profissionais WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao autenticar' });
      }
      if (results.length === 0) {
        return res.status(401).json({ success: false, message: 'Email ou senha inválidos' });
      }
      const prof = results[0];
      if (prof.status_aprovacao !== 'aprovado') {
        return res.status(401).json({ success: false, message: 'Seu cadastro ainda não foi aprovado pelo administrador' });
      }
      try {
        const senhaValida = await bcrypt.compare(senha, prof.senha);
        if (!senhaValida) {
          return res.status(401).json({ success: false, message: 'Email ou senha inválidos' });
        }
        const token = jwt.sign(
          { id: prof.id, email: prof.email, nome_perfil: prof.nome_perfil },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.json({
          success: true,
          message: 'Login realizado com sucesso',
          data: {
            token,
            profissional: {
              id: prof.id,
              nome_perfil: prof.nome_perfil,
              email: prof.email,
              foto_perfil: prof.foto_perfil,
              profissao: prof.profissao,
              cidade: prof.cidade,
              estado: prof.estado
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
  // GET /api/profissionais/me
  // Dados do profissional logado (via token)
  // ============================================
  router.get('/me', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      db.query('SELECT * FROM profissionais WHERE id = ?', [decoded.id], (err, results) => {
        if (err || results.length === 0) {
          return res.status(401).json({ success: false, message: 'Profissional não encontrado' });
        }
        const prof = results[0];
        res.json({
          success: true,
          data: {
            id: prof.id,
            cpf: prof.cpf,
            nome_perfil: prof.nome_perfil,
            email: prof.email,
            foto_perfil: prof.foto_perfil,
            profissao: prof.profissao,
            data_nascimento: prof.data_nascimento,
            endereco: prof.endereco,
            numero: prof.numero,
            bairro: prof.bairro,
            cidade: prof.cidade,
            estado: prof.estado,
            cep: prof.cep,
            fotos_servicos: prof.fotos_servicos ? JSON.parse(prof.fotos_servicos) : [],
            status_aprovacao: prof.status_aprovacao,
            data_cadastro: prof.data_cadastro
          }
        });
      });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }
  });

  // ============================================
  // PUT /api/profissionais/me
  // Profissional atualiza os próprios dados (exceto CPF)
  // ============================================
  router.put('/me', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }

    const {
      nome_perfil, email, data_nascimento, endereco, numero, bairro,
      cidade, estado, cep, foto_perfil, fotos_servicos
    } = req.body;

    const campos = [];
    const params = [];

    if (nome_perfil !== undefined) { campos.push('nome_perfil = ?'); params.push(nome_perfil); }
    if (email !== undefined) { campos.push('email = ?'); params.push(email); }
    if (data_nascimento !== undefined) { campos.push('data_nascimento = ?'); params.push(data_nascimento); }
    if (endereco !== undefined) { campos.push('endereco = ?'); params.push(endereco); }
    if (numero !== undefined) { campos.push('numero = ?'); params.push(numero); }
    if (bairro !== undefined) { campos.push('bairro = ?'); params.push(bairro); }
    if (cidade !== undefined) { campos.push('cidade = ?'); params.push(cidade); }
    if (estado !== undefined) { campos.push('estado = ?'); params.push(estado.toUpperCase()); }
    if (cep !== undefined) { campos.push('cep = ?'); params.push(cep); }
    if (foto_perfil !== undefined) { campos.push('foto_perfil = ?'); params.push(foto_perfil); }
    if (fotos_servicos !== undefined) { campos.push('fotos_servicos = ?'); params.push(JSON.stringify(fotos_servicos)); }

    if (campos.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
    }

    params.push(decoded.id);
    const sql = 'UPDATE profissionais SET ' + campos.join(', ') + ' WHERE id = ?';

    db.query(sql, params, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: 'Este e-mail já está em uso por outro profissional.' });
        }
        console.error('Erro ao atualizar profissional:', err);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar profissional' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
      }
      res.json({ success: true, message: 'Dados atualizados com sucesso!' });
    });
  });

  // ============================================
  // GET /api/profissionais/:id
  // Buscar profissional por ID
  // ============================================
  router.get('/:id', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query('SELECT * FROM profissionais WHERE id = ?', [req.params.id], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
      }
      const profissional = {
        ...results[0],
        fotos_servicos: results[0].fotos_servicos ? JSON.parse(results[0].fotos_servicos) : []
      };
      res.json({ success: true, data: profissional });
    });
  });

  // ============================================
  // POST /api/profissionais
  // Cadastro de profissional (com email+senha)
  // ============================================
  router.post('/', async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const {
      cpf, data_nascimento, endereco, numero, bairro, cidade, estado,
      cep, nome_perfil, foto_perfil, profissao, fotos_servicos,
      email, senha
    } = req.body;

    if (!cpf || !data_nascimento || !endereco || !bairro || !cidade || !estado || !cep || !nome_perfil || !profissao) {
      return res.status(400).json({ success: false, message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    if (!email || !senha) {
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios para criar sua conta' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se CPF já existe
    db.query('SELECT id FROM profissionais WHERE cpf = ?', [cpf], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Erro ao verificar CPF' });
      }
      if (results.length > 0) {
        return res.status(400).json({ success: false, message: 'CPF já cadastrado no sistema' });
      }

      // Verificar se email já existe
      db.query('SELECT id FROM profissionais WHERE email = ?', [email], (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao verificar email' });
        }
        if (results.length > 0) {
          return res.status(400).json({ success: false, message: 'Email já cadastrado no sistema' });
        }

        // Hash da senha
        bcrypt.hash(senha, 10, (err, senhaHash) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao processar senha' });
          }

          const fotosServicosStr = fotos_servicos ? JSON.stringify(fotos_servicos) : '[]';

          db.query(
            `INSERT INTO profissionais 
            (cpf, data_nascimento, endereco, numero, bairro, cidade, estado, cep, nome_perfil, foto_perfil, profissao, fotos_servicos, status_aprovacao, email, senha) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`,
            [cpf, data_nascimento, endereco, numero || '', bairro, cidade, estado.toUpperCase(), cep, nome_perfil, foto_perfil || '', profissao, fotosServicosStr, email, senhaHash],
            (err, result) => {
              if (err) {
                console.error('Erro ao cadastrar profissional:', err);
                return res.status(500).json({ success: false, message: 'Erro ao cadastrar profissional' });
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
    });
  });

  return router;
};
