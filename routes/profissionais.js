// ============================================
// Rotas de Profissionais
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { sendEmail } = require('../config/email');

const JWT_SECRET = process.env.JWT_SECRET || 'acheei_secret_key_2024_admin';

cloudinary.config({
  cloud_name: 'dzwkr47ib',
  api_key: '553561859359519',
  api_secret: 'IYJBytc-xlGnFW87Taguno77LDw',
  secure: true
});

// ============================================
// Autocorreção de domínio de e-mail
// Evita que o usuário burle/erro o domínio
// (ex: @gmil -> @gmail.com, @hotmial -> @hotmail.com)
// ============================================
const DOMINIOS_EMAIL_CONHECIDOS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'outlook.com.br', 'yahoo.com',
  'icloud.com', 'live.com', 'uol.com.br', 'bol.com.br', 'terra.com.br',
  'globo.com', 'aol.com', 'proton.me', 'msn.com'
];

function distanciaLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + custo);
    }
  }
  return dp[m][n];
}

function corrigirDominioEmail(email) {
  if (!email || !email.includes('@')) return email;
  const partes = email.split('@');
  if (partes.length !== 2) return email;
  const usuario = partes[0];
  const dominio = partes[1].trim().toLowerCase();
  if (!dominio) return email;

  if (DOMINIOS_EMAIL_CONHECIDOS.includes(dominio)) return email.trim();

  let melhorDominio = null;
  let melhorDistancia = 3;

  for (const conhecido of DOMINIOS_EMAIL_CONHECIDOS) {
    const baseConhecido = conhecido.split('.')[0];
    const dist = Math.min(
      distanciaLevenshtein(dominio, baseConhecido),
      distanciaLevenshtein(dominio, conhecido)
    );
    if (dist < melhorDistancia) {
      melhorDistancia = dist;
      melhorDominio = conhecido;
    }
  }

  if (melhorDominio && melhorDistancia <= 2) {
    return usuario + '@' + melhorDominio;
  }
  return email.trim();
}

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
    
var sql = `SELECT p.*, COALESCE(a.total_avaliacoes, 0) AS total_avaliacoes,
      COALESCE(a.media_avaliacoes, 0) AS media_avaliacoes,
      COALESCE(a.ranking_score, 3.5) AS ranking_score,
      COALESCE(p.rejeicoes, 0) AS rejeicoes
      FROM profissionais p
      LEFT JOIN (
        SELECT profissional_id, COUNT(*) AS total_avaliacoes, ROUND(AVG(nota), 1) AS media_avaliacoes,
          ((AVG(nota) * COUNT(*) + 3.5 * 5) / (COUNT(*) + 5)) AS ranking_score
        FROM avaliacoes GROUP BY profissional_id
      ) a ON a.profissional_id = p.id
      WHERE p.status_aprovacao = "aprovado"`;
    var params = [];

    if (cidade) { sql += ' AND p.cidade LIKE ?'; params.push('%' + cidade + '%'); }
    if (estado) { sql += ' AND p.estado = ?'; params.push(estado.toUpperCase()); }
    if (profissao) { sql += ' AND p.profissao LIKE ?'; params.push('%' + profissao + '%'); }

    // Penaliza o ranking por rejeições: cada rejeição subtrai 0.5 ponto do ranking_score.
    // Assim, quanto mais solicitações o profissional rejeita, mais para trás ele aparece.
    sql += ' ORDER BY (ranking_score - COALESCE(p.rejeicoes, 0) * 0.5) DESC, total_avaliacoes DESC, p.data_cadastro DESC';

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
          status_aprovacao: prof.status_aprovacao, data_cadastro: prof.data_cadastro,
          media_avaliacoes: Number(prof.media_avaliacoes) || 0,
          total_avaliacoes: Number(prof.total_avaliacoes) || 0
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
      'Cabeleireiro', 'Manicure', 'Massagista', 'Técnico em Ar Condicionado',
      'Montador de Móveis', 'Frete e Mudanças', 'Gesseiro', 'Ajudante de Pedreiro',
      'Metalúrgico', 'Adesivador'
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
      if (!prof.email_verificado) {
        return res.status(403).json({ success: false, message: 'Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada (ou spam).' });
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
  // POST /api/profissionais/push-subscription
  // Salvar assinatura push do profissional logado
  // ============================================
  router.post('/push-subscription', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const profissionalId = decoded.id;
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ success: false, message: 'Assinatura push inválida' });
      }
      const subStr = JSON.stringify(subscription);
      db.query('UPDATE profissionais SET push_subscription = ? WHERE id = ?', [subStr, profissionalId], (err) => {
        if (err) {
          console.error('Erro ao salvar assinatura push (profissional):', err);
          return res.status(500).json({ success: false, message: 'Erro ao salvar assinatura push' });
        }
        res.json({ success: true, message: 'Notificações ativadas para profissional' });
      });
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }
  });

  // ============================================
  // GET /api/profissionais/push-subscription
  // Retorna assinatura do profissional (diagnóstico)
  // ============================================
  router.get('/push-subscription', (req, res) => {
    if (!dbConnected()) return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const profissionalId = decoded.id;
      db.query('SELECT push_subscription FROM profissionais WHERE id = ?', [profissionalId], (err, results) => {
        if (err) { console.error('Erro ao buscar assinatura push (profissional):', err); return res.status(500).json({ success: false, message: 'Erro ao buscar assinatura' }); }
        if (results.length === 0 || !results[0].push_subscription) return res.json({ success: true, data: null });
        try { const sub = JSON.parse(results[0].push_subscription); return res.json({ success: true, data: sub }); } catch (e) { return res.json({ success: true, data: results[0].push_subscription }); }
      });
    } catch (e) { return res.status(401).json({ success: false, message: 'Token inválido ou expirado' }); }
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
  // POST /api/profissionais/verificar-email-inicial
  // Envia link de confirmação ANTES do cadastro completo
  // (usado no passo 1 do formulário, ao clicar em Próximo)
  // ============================================
  router.post('/verificar-email-inicial', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { email, nome } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Informe um e-mail válido' });
    }

    // Se já existe profissional cadastrado com esse email, não deixa prosseguir
    db.query('SELECT id FROM profissionais WHERE email = ?', [email], (err, profResults) => {
      if (err) {
        console.error('Erro ao verificar email:', err);
        return res.status(500).json({ success: false, message: 'Erro ao verificar e-mail' });
      }
      if (profResults.length > 0) {
        return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado no sistema' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      const nomeContato = nome || 'Profissional';

      db.query(
        `INSERT INTO pre_verificacoes_email (email, token, codigo, verificado) VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE token = ?, codigo = ?, verificado = 0, data_criacao = CURRENT_TIMESTAMP`,
        [email, token, codigo, token, codigo],
        (err2) => {
          if (err2) {
            console.error('Erro ao registrar pré-verificação:', err2);
            return res.status(500).json({ success: false, message: 'Erro ao processar verificação de e-mail' });
          }
          const link = (process.env.APP_URL || '') + '/api/profissionais/confirmar-email?token=' + token;
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#e60000;">Confirme seu e-mail - Acheei</h2>
              <p>Olá!</p>
              <p>Para continuar seu cadastro na Acheei, use o código abaixo na página de cadastro:</p>
              <p style="text-align:center;margin:24px 0;">
                <span style="display:inline-block;background:#f5f5f5;border:2px dashed #e60000;color:#e60000;font-size:28px;font-weight:bold;letter-spacing:6px;padding:14px 24px;border-radius:8px;">${codigo}</span>
              </p>
              <p>Ou, se preferir, clique no botão para confirmar automaticamente:</p>
              <p style="text-align:center;margin:20px 0;">
                <a href="${link}" style="background:#e60000;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Confirmar E-mail</a>
              </p>
              <p style="color:#999;font-size:12px;">O código e o link expiram em 24 horas.</p>
            </div>`;
          sendEmail({
            toEmail: email,
            toName: nomeContato,
            subject: 'Confirme seu e-mail - Acheei',
            htmlContent: html,
            textContent: 'Seu codigo de confirmacao Acheei: ' + codigo + '. Ou acesse: ' + link
          }).then(() => {
            res.json({ success: true, message: 'Código e link de confirmação enviados para seu e-mail.' });
          }).catch(e => {
            console.error('Erro ao enviar e-mail de pré-verificação:', e.message);
            res.status(500).json({ success: false, message: 'Erro ao enviar o e-mail. Tente novamente mais tarde.' });
          });
        }
      );
    });
  });

  // ============================================
  // POST /api/profissionais/confirmar-codigo
  // Confirma o e-mail do passo 1 usando o código de 6 dígitos
  // (alternativa ao link, que pode ser afetado pelo rastreamento
  // de cliques de provedores de e-mail)
  // ============================================
  router.post('/confirmar-codigo', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { email, codigo } = req.body;
    if (!email || !codigo) {
      return res.status(400).json({ success: false, message: 'Informe o e-mail e o código' });
    }
    db.query('SELECT id, codigo, verificado FROM pre_verificacoes_email WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Erro ao confirmar código:', err);
        return res.status(500).json({ success: false, message: 'Erro ao confirmar código' });
      }
      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhuma verificação pendente para este e-mail' });
      }
      const registro = results[0];
      if (registro.verificado) {
        return res.json({ success: true, message: 'E-mail já confirmado.' });
      }
      if (String(registro.codigo) !== String(codigo).trim()) {
        return res.status(400).json({ success: false, message: 'Código incorreto. Verifique e tente novamente.' });
      }
      db.query('UPDATE pre_verificacoes_email SET verificado = 1 WHERE id = ?', [registro.id], (err2) => {
        if (err2) {
          console.error('Erro ao atualizar verificação por código:', err2);
          return res.status(500).json({ success: false, message: 'Erro ao confirmar código' });
        }
        res.json({ success: true, message: 'E-mail confirmado com sucesso!' });
      });
    });
  });

  // ============================================
  // GET /api/profissionais/status-verificacao-email?email=...
  // Verifica se o e-mail já foi confirmado (usado no passo 1)
  // ============================================
  router.get('/status-verificacao-email', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Informe o e-mail' });
    }
    db.query('SELECT verificado FROM pre_verificacoes_email WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Erro ao consultar status de verificação:', err);
        return res.status(500).json({ success: false, message: 'Erro ao consultar status' });
      }
      const verificado = results.length > 0 && !!results[0].verificado;
      res.json({ success: true, verificado });
    });
  });

  // ============================================
  // GET /api/profissionais/confirmar-email?token=...
  // Confirma o e-mail (público). Aceita tokens do pré-cadastro
  // (passo 1, tabela pre_verificacoes_email) e de profissionais
  // já cadastrados (tabela profissionais).
  // IMPORTANTE: registrada antes de /:id para não conflitar
  // ============================================
  router.get('/confirmar-email', (req, res) => {
    const token = req.query.token;
    if (!token) {
      return res.status(400).send(htmlConfirmacao(false, 'Token de confirmação não fornecido.'));
    }
    if (!dbConnected()) {
      return res.status(503).send(htmlConfirmacao(false, 'Banco de dados indisponível. Tente novamente mais tarde.'));
    }

    // 1) Tenta confirmar como pré-verificação (passo 1 do cadastro)
    db.query('SELECT id, email, verificado FROM pre_verificacoes_email WHERE token = ?', [token], (errPre, preResults) => {
      if (errPre) {
        console.error('Erro ao confirmar e-mail (pré-verificação):', errPre);
        return res.status(500).send(htmlConfirmacao(false, 'Erro ao confirmar e-mail. Tente novamente.'));
      }
      if (preResults.length > 0) {
        const pre = preResults[0];
        if (pre.verificado) {
          return res.send(htmlConfirmacao(true, 'Seu e-mail já foi confirmado anteriormente. Você pode voltar ao cadastro e continuar.'));
        }
        return db.query('UPDATE pre_verificacoes_email SET verificado = 1 WHERE id = ?', [pre.id], (err2) => {
          if (err2) {
            console.error('Erro ao atualizar pré-verificação:', err2);
            return res.status(500).send(htmlConfirmacao(false, 'Erro ao confirmar e-mail. Tente novamente.'));
          }
          res.send(htmlConfirmacao(true, 'E-mail confirmado com sucesso! Volte para a página de cadastro para continuar seu registro.'));
        });
      }

      // 2) Não achou em pré-verificação: tenta como profissional já cadastrado
      db.query('SELECT id, nome_perfil, email, token_verificacao, email_verificado FROM profissionais WHERE token_verificacao = ?', [token], (err, results) => {
        if (err) {
          console.error('Erro ao confirmar e-mail:', err);
          return res.status(500).send(htmlConfirmacao(false, 'Erro ao confirmar e-mail. Tente novamente.'));
        }
        if (results.length === 0) {
          return res.status(400).send(htmlConfirmacao(false, 'Link de confirmação inválido ou expirado.'));
        }
        const prof = results[0];
        if (prof.email_verificado) {
          return res.send(htmlConfirmacao(true, 'Seu e-mail já foi confirmado anteriormente. Você já pode fazer login.'));
        }
        // Marca como verificado e limpa o token
        db.query('UPDATE profissionais SET email_verificado = 1, token_verificacao = NULL WHERE id = ?', [prof.id], (err2) => {
          if (err2) {
            console.error('Erro ao atualizar confirmação:', err2);
            return res.status(500).send(htmlConfirmacao(false, 'Erro ao confirmar e-mail. Tente novamente.'));
          }
          res.send(htmlConfirmacao(true, 'E-mail confirmado com sucesso! Você já pode fazer login quando seu perfil for aprovado.'));
        });
      });
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
    db.query(`SELECT p.*, COALESCE(a.total_avaliacoes, 0) AS total_avaliacoes,
      COALESCE(a.media_avaliacoes, 0) AS media_avaliacoes
      FROM profissionais p
      LEFT JOIN (
        SELECT profissional_id, COUNT(*) AS total_avaliacoes, ROUND(AVG(nota), 1) AS media_avaliacoes
        FROM avaliacoes GROUP BY profissional_id
      ) a ON a.profissional_id = p.id
      WHERE p.id = ?`, [req.params.id], (err, results) => {
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
    let {
      cpf, data_nascimento, endereco, numero, bairro, cidade, estado,
      cep, nome_perfil, foto_perfil, profissao, fotos_servicos,
      email, senha
    } = req.body;

    // Autocorrige o domínio do e-mail antes de salvar (ex: @gmil -> @gmail.com)
    email = corrigirDominioEmail(email || '');

if (!cpf || !data_nascimento || !endereco || !bairro || !cidade || !estado || !cep || !nome_perfil || !profissao) {
      return res.status(400).json({ success: false, message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    if (!foto_perfil) {
      return res.status(400).json({ success: false, message: 'A foto de perfil é obrigatória' });
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

// Verificar se email já existe como profissional
      db.query('SELECT id FROM profissionais WHERE email = ?', [email], (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao verificar email' });
        }
        if (results.length > 0) {
          return res.status(400).json({ success: false, message: 'Email já cadastrado no sistema' });
        }

        // Verificar se email já existe como cliente
        db.query('SELECT id FROM clientes WHERE email = ?', [email], (err, clienteResults) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao verificar email' });
        }
        if (clienteResults.length > 0) {
          return res.status(400).json({ success: false, message: 'Este email já está cadastrado como cliente. Use outro email para criar uma conta de profissional.' });
        }

        // Verificar se o e-mail já foi confirmado no passo 1 (pre_verificacoes_email)
        db.query('SELECT verificado FROM pre_verificacoes_email WHERE email = ?', [email], (err, preResults) => {
          if (err) {
            console.error('Erro ao verificar pré-verificação de email:', err);
            return res.status(500).json({ success: false, message: 'Erro ao verificar confirmação de e-mail' });
          }
          const emailJaConfirmado = preResults.length > 0 && !!preResults[0].verificado;
          if (!emailJaConfirmado) {
            return res.status(400).json({ success: false, message: 'Confirme seu e-mail antes de concluir o cadastro.' });
          }

// Hash da senha
        bcrypt.hash(senha, 10, (err, senhaHash) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao processar senha' });
          }

          const fotosServicosStr = fotos_servicos ? JSON.stringify(fotos_servicos) : '[]';

          db.query(
            `INSERT INTO profissionais 
            (cpf, data_nascimento, endereco, numero, bairro, cidade, estado, cep, nome_perfil, foto_perfil, profissao, fotos_servicos, status_aprovacao, email, senha, email_verificado, token_verificacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, 1, NULL)`,
            [cpf, data_nascimento, endereco, numero || '', bairro, cidade, estado.toUpperCase(), cep, nome_perfil, foto_perfil || '', profissao, fotosServicosStr, email, senhaHash],
            (err, result) => {
              if (err) {
                console.error('Erro ao cadastrar profissional:', err);
                return res.status(500).json({ success: false, message: 'Erro ao cadastrar profissional' });
              }
              // Limpa o registro de pré-verificação, já não é mais necessário
              db.query('DELETE FROM pre_verificacoes_email WHERE email = ?', [email], () => {});

              res.status(201).json({
                success: true,
                message: 'Cadastro realizado com sucesso! Seu perfil será analisado pelo administrador.',
                data: { id: result.insertId, emailVerificado: true }
              });
            }
          );
        });
        });
        });
      });
    });
  });

  // ============================================
  // DELETE /api/profissionais/me
  // Autoexclusão de conta pelo próprio profissional
  // Remove fotos do Cloudinary, solicitações e o profissional.
  // As avaliações permanecem vinculadas ao histórico até aqui,
  // mas são removidas em cascata pois pertencem a este profissional
  // (profissional_id ON DELETE CASCADE).
  // ============================================
  router.delete('/me', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
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

    db.query('SELECT * FROM profissionais WHERE id = ?', [decoded.id], async (err, results) => {
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
      db.query('DELETE FROM solicitacoes WHERE profissional_id = ?', [prof.id], (err) => {
        if (err) console.error('Erro ao deletar solicitacoes:', err);
      });

      // Deletar profissional do banco (cascateia avaliacoes, orçamentos, etc via profissional_id)
      db.query('DELETE FROM profissionais WHERE id = ?', [prof.id], (err) => {
        if (err) {
          console.error('Erro ao deletar profissional:', err);
          return res.status(500).json({ success: false, message: 'Erro ao excluir conta' });
        }

        res.json({
          success: true,
          message: 'Conta excluída permanentemente.',
          erros: erros.length > 0 ? erros : undefined
        });
      });
    });
  });

  // ============================================
  // POST /api/profissionais/reenviar-email
  // Reenvia o e-mail de confirmação para o profissional
  // ============================================
  router.post('/reenviar-email', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Informe seu e-mail para reenviar a confirmação' });
    }
    db.query('SELECT id, nome_perfil, email_verificado FROM profissionais WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Erro ao buscar profissional para reenvio:', err);
        return res.status(500).json({ success: false, message: 'Erro ao processar reenvio' });
      }
      if (results.length === 0) {
        // Não revela se o e-mail existe (evita enumeração), mas retorna sucesso para não dar dica
        return res.json({ success: true, message: 'Se o e-mail estiver cadastrado e não confirmado, enviaremos um novo link.' });
      }
      const prof = results[0];
      if (prof.email_verificado) {
        return res.json({ success: true, message: 'Este e-mail já está confirmado.' });
      }
      // Gera novo token e envia
      const novoToken = crypto.randomBytes(32).toString('hex');
      db.query('UPDATE profissionais SET token_verificacao = ? WHERE id = ?', [novoToken, prof.id], (err2) => {
        if (err2) {
          console.error('Erro ao gerar novo token:', err2);
          return res.status(500).json({ success: false, message: 'Erro ao processar reenvio' });
        }
        const link = (process.env.APP_URL || '') + '/api/profissionais/confirmar-email?token=' + novoToken;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#e60000;">Confirme seu e-mail - Acheei</h2>
            <p>Olá, <strong>${prof.nome_perfil}</strong>!</p>
            <p>Para concluir seu cadastro na Acheei, confirme seu endereço de e-mail clicando no botão abaixo:</p>
            <p style="text-align:center;margin:30px 0;">
              <a href="${link}" style="background:#e60000;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Confirmar E-mail</a>
            </p>
            <p style="color:#999;font-size:12px;">Este link expira em 24 horas.</p>
          </div>`;
        sendEmail({
          toEmail: email,
          toName: prof.nome_perfil,
          subject: 'Confirme seu e-mail - Acheei',
          htmlContent: html,
          textContent: 'Olá, ' + prof.nome_perfil + '! Confirme seu e-mail na Acheei acessando: ' + link
        }).then(() => {
          res.json({ success: true, message: 'Novo link de confirmação enviado para seu e-mail.' });
        }).catch(e => {
          console.error('Erro ao reenviar e-mail:', e.message);
          res.status(500).json({ success: false, message: 'Erro ao enviar o e-mail. Tente novamente mais tarde.' });
        });
      });
    });
  });

  return router;
};

// Página HTML simples exibida após a confirmação do e-mail
function htmlConfirmacao(sucesso, mensagem) {
  const titulo = sucesso ? 'E-mail confirmado' : 'Falha na confirmação';
  const cor = sucesso ? '#155724' : '#721c24';
  const fundo = sucesso ? '#d4edda' : '#f8d7da';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo} - Acheei</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f0f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .badge { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: bold; color: ${cor}; background: ${fundo}; margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #555; line-height: 1.5; }
    a.btn { display: inline-block; margin-top: 20px; background: #e60000; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${titulo}</div>
    <h1>${sucesso ? 'Obrigado!' : 'Atenção'}</h1>
    <p>${mensagem}</p>
    <a class="btn" href="${process.env.APP_URL || '/'}">Voltar para o site</a>
  </div>
</body>
</html>`;
}
