// ============================================
// Rotas de Clientes
// Cadastro, Login, Solicitações, Orçamentos, Chat
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'acheei_secret_key_2024_admin';

// Número do WhatsApp comercial da Acheei (formato internacional, só dígitos)
// Para onde o cliente envia a mensagem com o código de confirmação (link wa.me)
const WHATSAPP_EMPRESA = process.env.WHATSAPP_EMPRESA || '5585991340658';

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
  // POST /api/clientes/cadastro
  // Cadastro de cliente
  // ============================================
  router.post('/cadastro', async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
let { nome, email, senha, telefone } = req.body;

    // Autocorrige o domínio do e-mail antes de salvar (ex: @gmil -> @gmail.com)
    email = corrigirDominioEmail(email || '');

    if (!nome || !email || !senha || !telefone) {
      return res.status(400).json({ success: false, message: 'Nome, email, senha e telefone são obrigatórios' });
    }
    // Telefone deve ter ao menos 10 dígitos (DDD + número) para ser válido
    const telefoneLimpo = String(telefone).replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      return res.status(400).json({ success: false, message: 'Informe um telefone válido com DDD para WhatsApp' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres' });
    }
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }

// Verificar se email já existe como cliente
    db.query('SELECT id FROM clientes WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Erro ao verificar email:', err);
        return res.status(500).json({ success: false, message: 'Erro ao verificar email' });
      }
      if (results.length > 0) {
        return res.status(400).json({ success: false, message: 'Este email já está cadastrado. Faça login.' });
      }

      // Verificar se email já existe como profissional
      db.query('SELECT id FROM profissionais WHERE email = ?', [email], (err, profResults) => {
        if (err) {
          console.error('Erro ao verificar email de profissional:', err);
          return res.status(500).json({ success: false, message: 'Erro ao verificar email' });
        }
        if (profResults.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Este email já está cadastrado como profissional. Para solicitar serviços como cliente, cadastre-se com outro email.'
          });
        }

      // Verificar se o WhatsApp do cliente já foi confirmado (passo de confirmação)
      let telefoneVerif = telefoneLimpo;
      if (!(telefoneVerif.startsWith('55') && (telefoneVerif.length === 12 || telefoneVerif.length === 13))) {
        telefoneVerif = '55' + telefoneLimpo;
      }
      db.query('SELECT verificado FROM pre_verificacoes_whatsapp WHERE telefone = ?', [telefoneVerif], (err, waResults) => {
        if (err) {
          console.error('Erro ao verificar confirmação de WhatsApp:', err);
          return res.status(500).json({ success: false, message: 'Erro ao verificar confirmação de WhatsApp' });
        }
        const waConfirmado = waResults.length > 0 && !!waResults[0].verificado;
        if (!waConfirmado) {
          return res.status(400).json({ success: false, message: 'Confirme seu WhatsApp antes de concluir o cadastro.' });
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
  // POST /api/clientes/verificar-whatsapp-inicial
  // Gera o código de confirmação do WhatsApp do cliente
  // (fluxo gratuito via link wa.me - o cliente envia o código
  // para o WhatsApp comercial da Acheei)
  // ============================================
  router.post('/verificar-whatsapp-inicial', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const telefoneBruto = (req.body.telefone || '').replace(/\D/g, '');
    if (telefoneBruto.length < 10) {
      return res.status(400).json({ success: false, message: 'Informe um telefone válido com DDD para WhatsApp' });
    }
    // Normaliza para o formato internacional (prefixo 55 - Brasil)
    // Números de 10-11 dígitos ainda não têm DDI; 12-13 já têm.
    const telefoneLimpo = telefoneBruto;
    let telefone = telefoneLimpo;
    if (!(telefone.startsWith('55') && (telefone.length === 12 || telefone.length === 13))) {
      telefone = '55' + telefoneLimpo;
    }

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const mensagem = 'Ola Acheei! Meu codigo de confirmacao de WhatsApp e: ' + codigo;
    const link = 'https://wa.me/' + WHATSAPP_EMPRESA + '?text=' + encodeURIComponent(mensagem);

    db.query(
      `INSERT INTO pre_verificacoes_whatsapp (telefone, codigo, verificado) VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE codigo = ?, verificado = 0, data_criacao = CURRENT_TIMESTAMP`,
      [telefone, codigo, codigo],
      (err) => {
        if (err) {
          console.error('Erro ao registrar pré-verificação de WhatsApp:', err);
          return res.status(500).json({ success: false, message: 'Erro ao processar a confirmação de WhatsApp' });
        }
        res.json({ success: true, message: 'Codigo gerado. Envie-o para nosso WhatsApp para confirmar.', codigo, link, telefone });
      }
    );
  });

  // ============================================
  // POST /api/clientes/confirmar-whatsapp
  // Valida o código digitado pelo cliente e marca o
  // WhatsApp como confirmado
  // ============================================
  router.post('/confirmar-whatsapp', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const telefone = (req.body.telefone || '').replace(/\D/g, '');
    const codigo = String(req.body.codigo || '').trim();
    if (!telefone || !codigo) {
      return res.status(400).json({ success: false, message: 'Informe o telefone e o código' });
    }
    db.query('SELECT id, codigo, verificado FROM pre_verificacoes_whatsapp WHERE telefone = ?', [telefone], (err, results) => {
      if (err) {
        console.error('Erro ao confirmar WhatsApp:', err);
        return res.status(500).json({ success: false, message: 'Erro ao confirmar WhatsApp' });
      }
      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhuma verificação pendente para este número' });
      }
      const registro = results[0];
      if (registro.verificado) {
        return res.json({ success: true, message: 'WhatsApp já confirmado.' });
      }
      if (String(registro.codigo) !== codigo) {
        return res.status(400).json({ success: false, message: 'Código incorreto. Verifique a mensagem enviada e tente novamente.' });
      }
      db.query('UPDATE pre_verificacoes_whatsapp SET verificado = 1 WHERE id = ?', [registro.id], (err2) => {
        if (err2) {
          console.error('Erro ao atualizar verificação de WhatsApp:', err2);
          return res.status(500).json({ success: false, message: 'Erro ao confirmar WhatsApp' });
        }
        res.json({ success: true, message: 'WhatsApp confirmado com sucesso!' });
      });
    });
  });

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
      `SELECT s.*, p.nome_perfil, p.profissao, p.foto_perfil, p.cidade, p.estado,
        a.id AS avaliacao_id, a.nota AS avaliacao_nota,
        (SELECT COUNT(*) FROM mensagens m WHERE m.solicitacao_id = s.id AND m.remetente = 'profissional' AND m.lida = FALSE) AS qtd_nao_lidas,
        (SELECT m.texto FROM mensagens m WHERE m.solicitacao_id = s.id ORDER BY m.data_envio DESC, m.id DESC LIMIT 1) AS ultima_mensagem,
        (SELECT m.remetente FROM mensagens m WHERE m.solicitacao_id = s.id ORDER BY m.data_envio DESC, m.id DESC LIMIT 1) AS ultima_mensagem_remetente
       FROM solicitacoes s
       JOIN profissionais p ON s.profissional_id = p.id
       LEFT JOIN avaliacoes a ON a.solicitacao_id = s.id
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
  // PUT /api/clientes/solicitacoes/marcar-vistas-pagamento
  // Marca as liberações de chat/pagamento como vistas
  // (zera o badge de "chat liberado" no sino de notificações)
  // ============================================
  router.put('/solicitacoes/marcar-vistas-pagamento', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      'UPDATE solicitacoes SET vista_pagamento_cliente = TRUE WHERE cliente_id = ? AND vista_pagamento_cliente = FALSE',
      [req.cliente.id],
      (err) => {
        if (err) {
          console.error('Erro ao marcar pagamentos como vistos:', err);
          return res.status(500).json({ success: false, message: 'Erro ao marcar pagamentos como vistos' });
        }
        res.json({ success: true });
      }
    );
  });

  // ============================================
  // POST /api/clientes/avaliacoes
  // Uma unica avaliacao, apenas para solicitacao do cliente com chat liberado
  // ============================================
  router.post('/avaliacoes', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponivel' });
    }
    const { solicitacao_id, nota, respeito, comprometimento, qualidade } = req.body;
    const respostasValidas = ['sim', 'parcialmente', 'nao'];
    const notaNumero = Number(nota);

    if (!Number.isInteger(notaNumero) || notaNumero < 1 || notaNumero > 5 ||
      !respostasValidas.includes(respeito) || !respostasValidas.includes(comprometimento) || !respostasValidas.includes(qualidade)) {
      return res.status(400).json({ success: false, message: 'Preencha a nota e todas as respostas da avaliacao.' });
    }

    db.query(
      'SELECT id, profissional_id FROM solicitacoes WHERE id = ? AND cliente_id = ? AND status_pagamento = "pago"',
      [solicitacao_id, req.cliente.id],
      (err, solicitacoes) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao verificar solicitacao' });
        if (solicitacoes.length === 0) {
          return res.status(403).json({ success: false, message: 'A avaliacao so e permitida apos a liberacao do chat desta solicitacao.' });
        }
        const solicitacao = solicitacoes[0];
        db.query(
          'INSERT INTO avaliacoes (solicitacao_id, profissional_id, cliente_id, nota, respeito, comprometimento, qualidade) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [solicitacao.id, solicitacao.profissional_id, req.cliente.id, notaNumero, respeito, comprometimento, qualidade],
          (insertErr) => {
            if (insertErr) {
              if (insertErr.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'Esta solicitacao ja foi avaliada.' });
              }
              console.error('Erro ao salvar avaliacao:', insertErr);
              return res.status(500).json({ success: false, message: 'Erro ao salvar avaliacao' });
            }
            res.status(201).json({ success: true, message: 'Avaliacao enviada com sucesso!' });
          }
        );
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
  // POST /api/clientes/push-subscription
  // Salvar assinatura push do cliente logado
  // ============================================
  router.post('/push-subscription', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Assinatura push inválida' });
    }

    // Salvar como JSON string (LONGTEXT)
    const subStr = JSON.stringify(subscription);

    db.query(
      'UPDATE clientes SET push_subscription = ? WHERE id = ?',
      [subStr, req.cliente.id],
      (err, result) => {
        if (err) {
          console.error('Erro ao salvar assinatura push:', err);
          return res.status(500).json({ success: false, message: 'Erro ao salvar assinatura push' });
        }
        res.json({
          success: true,
          message: 'Notificações ativadas com sucesso!',
          data: { ativo: true }
        });
      }
    );
  });

  // ============================================
  // GET /api/clientes/push-subscription
  // Retorna a assinatura push atual do cliente (diagnóstico)
  // ============================================
  router.get('/push-subscription', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query('SELECT push_subscription FROM clientes WHERE id = ?', [req.cliente.id], (err, results) => {
      if (err) {
        console.error('Erro ao buscar assinatura push (diagnóstico):', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar assinatura push' });
      }
      if (results.length === 0 || !results[0].push_subscription) {
        return res.json({ success: true, data: null });
      }
      try {
        const sub = JSON.parse(results[0].push_subscription);
        return res.json({ success: true, data: sub });
      } catch (e) {
        return res.json({ success: true, data: results[0].push_subscription });
      }
    });
  });

  // ============================================
  // GET /api/clientes/mensagens/:solicitacao_id
  // Mensagens do chat de uma solicitação
  // ============================================
  router.get('/mensagens/:solicitacao_id', authMiddleware, (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    // Verificar se a solicitação pertence ao cliente e se o pagamento foi feito
    db.query(
      'SELECT id, status_pagamento FROM solicitacoes WHERE id = ? AND cliente_id = ?',
      [req.params.solicitacao_id, req.cliente.id],
      (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
        }
        if (results.length === 0) {
          return res.status(403).json({ success: false, message: 'Solicitação não encontrada ou não pertence a você' });
        }
        // O chat só é liberado quando o profissional confirma o pagamento
        if (results[0].status_pagamento !== 'pago') {
          return res.status(403).json({
            success: false,
            message: 'O chat ainda não foi liberado. O profissional precisa concluir o pagamento para liberar a conversa.'
          });
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

// Verificar se a solicitação pertence ao cliente e se o pagamento foi feito
    db.query(
      'SELECT id, status_pagamento FROM solicitacoes WHERE id = ? AND cliente_id = ?',
      [solicitacao_id, req.cliente.id],
      (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
        }
        if (results.length === 0) {
          return res.status(403).json({ success: false, message: 'Solicitação não encontrada ou não pertence a você' });
        }
        // O chat só é liberado quando o profissional confirma o pagamento
        if (results[0].status_pagamento !== 'pago') {
          return res.status(403).json({
            success: false,
            message: 'O chat ainda não foi liberado. O profissional precisa concluir o pagamento para liberar a conversa.'
          });
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
