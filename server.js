// ============================================
// Acheei - Servidor Principal
// Plataforma de Intermediacao de Servicos
// ============================================

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const profissoes = require('./config/profissoes');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// Variavel global de status do DB
// ============================================
var dbConnected = false;
var setupJaFeito = false;

// ============================================
// Conexao com MySQL usando POOL limitado + reconexao automatica
// FreeSQLDatabase limita max_user_connections (geralmente 5).
// Usamos ate 4 conexoes para dar boa concorrencia (50+ usuarios)
// sem estourar o limite do banco. O pool recupera conexoes mortas
// sozinho e as queries concorrentes aguardam em fila.
// ============================================
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'acheei',
  waitForConnections: true,
  connectionLimit: 4,
  queueLimit: 0,
  multipleStatements: true,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Se uma conexao do pool cair, marca como indisponivel
// (o pool continua tentando conexoes novas sozinho)
db.on('error', function(err) {
  console.error('Erro no banco de dados:', err.message);
  dbConnected = false;
});

// ============================================
// Setup do schema / admin (apenas quando o banco
// estiver realmente disponivel)
// ============================================
function setupBanco() {
  var senhaHash = bcrypt.hashSync('admin123', 10);
  db.query(
    'INSERT INTO admin (usuario, senha) VALUES (?, ?) ON DUPLICATE KEY UPDATE usuario = usuario',
    ['admin', senhaHash],
    function(err) {
      if (err) {
        console.error('Erro ao criar admin padrao:', err.message);
      } else {
        console.log('Admin padrao garantido: usuario=admin / senha=admin123');
      }
    }
  );
}

// ============================================
// Cria/confirma as tabelas e o admin
// (usar aspas simples e LONGTEXT - banco remoto FreeSQLDatabase)
// ============================================
function criarTabelas() {
  db.query("CREATE TABLE IF NOT EXISTS profissionais (id INT AUTO_INCREMENT PRIMARY KEY, cpf VARCHAR(14) NOT NULL UNIQUE, data_nascimento DATE NOT NULL, endereco VARCHAR(255) NOT NULL, numero VARCHAR(20), bairro VARCHAR(100) NOT NULL, cidade VARCHAR(100) NOT NULL, estado VARCHAR(2) NOT NULL, cep VARCHAR(9) NOT NULL, nome_perfil VARCHAR(100) NOT NULL, foto_perfil VARCHAR(255), profissao VARCHAR(100) NOT NULL, fotos_servicos LONGTEXT, status_aprovacao ENUM('pendente','aprovado','reprovado') DEFAULT 'pendente', data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  db.query('CREATE TABLE IF NOT EXISTS solicitacoes (id INT AUTO_INCREMENT PRIMARY KEY, cliente_nome VARCHAR(100) NOT NULL, cliente_telefone VARCHAR(20) NOT NULL, descricao TEXT NOT NULL, profissional_id INT NOT NULL, data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  db.query('CREATE TABLE IF NOT EXISTS admin (id INT AUTO_INCREMENT PRIMARY KEY, usuario VARCHAR(50) NOT NULL UNIQUE, senha VARCHAR(255) NOT NULL)');
  db.query('CREATE TABLE IF NOT EXISTS orcamentos (id INT AUTO_INCREMENT PRIMARY KEY, profissional_id INT NOT NULL, solicitacao_id INT, cliente_nome VARCHAR(100) NOT NULL, descricao TEXT NOT NULL, valor DECIMAL(10,2) NOT NULL, status ENUM("pendente","aprovado","recusado") DEFAULT "pendente", data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE, FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE SET NULL)');
  db.query('CREATE TABLE IF NOT EXISTS mensagens (id INT AUTO_INCREMENT PRIMARY KEY, solicitacao_id INT NOT NULL, remetente VARCHAR(50) NOT NULL, texto TEXT NOT NULL, lida BOOLEAN DEFAULT FALSE, data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE)');
  db.query('CREATE TABLE IF NOT EXISTS clientes (id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL UNIQUE, senha VARCHAR(255) NOT NULL, telefone VARCHAR(20), data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  db.query("CREATE TABLE IF NOT EXISTS avaliacoes (id INT AUTO_INCREMENT PRIMARY KEY, solicitacao_id INT NOT NULL UNIQUE, profissional_id INT NOT NULL, cliente_id INT NOT NULL, nota TINYINT NOT NULL, respeito ENUM('sim','parcialmente','nao') NOT NULL, comprometimento ENUM('sim','parcialmente','nao') NOT NULL, qualidade ENUM('sim','parcialmente','nao') NOT NULL, data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE, FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE, FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE)");
  // Adicionar colunas novas se não existirem (compatibilidade)
  db.query("ALTER TABLE profissionais ADD COLUMN email VARCHAR(100) UNIQUE AFTER data_cadastro", function(err) { if (err) { /* coluna já existe */ } });
  db.query("ALTER TABLE profissionais ADD COLUMN senha VARCHAR(255) AFTER email", function(err) { if (err) { /* coluna já existe */ } });
  db.query("ALTER TABLE solicitacoes ADD COLUMN status_pagamento ENUM('pendente','pago') DEFAULT 'pendente' AFTER data_solicitacao", function(err) { if (err) { /* coluna já existe */ } });
  db.query("ALTER TABLE solicitacoes ADD COLUMN cliente_id INT AFTER profissional_id", function(err) { if (err) { /* coluna já existe */ } });
  db.query("ALTER TABLE solicitacoes ADD COLUMN preference_id VARCHAR(100) AFTER status_pagamento", function(err) { if (err) { /* coluna já existe */ } });
  db.query("ALTER TABLE clientes ADD COLUMN push_subscription LONGTEXT", function(err) { if (err && !String(err.message).toLowerCase().includes('duplicate')) { console.error('Erro ao adicionar push_subscription:', err.message); } });
  db.query("ALTER TABLE clientes ADD COLUMN foto_perfil VARCHAR(255)", function(err) { if (err && !String(err.message).toLowerCase().includes('duplicate')) { console.error('Erro ao adicionar foto_perfil:', err.message); } });
  db.query("ALTER TABLE profissionais ADD COLUMN push_subscription LONGTEXT", function(err) { if (err && !String(err.message).toLowerCase().includes('duplicate')) { console.error('Erro ao adicionar push_subscription em profissionais:', err.message); } });
  db.query("ALTER TABLE profissionais ADD COLUMN email_verificado BOOLEAN DEFAULT 0 AFTER senha", function(err) { if (err && !String(err.message).toLowerCase().includes('duplicate')) { console.error('Erro ao adicionar email_verificado:', err.message); } });
  db.query("ALTER TABLE profissionais ADD COLUMN token_verificacao VARCHAR(255) AFTER email_verificado", function(err) { if (err && !String(err.message).toLowerCase().includes('duplicate')) { console.error('Erro ao adicionar token_verificacao:', err.message); } });
  db.query("CREATE TABLE IF NOT EXISTS pre_verificacoes_email (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(100) NOT NULL UNIQUE, token VARCHAR(255) NOT NULL, verificado BOOLEAN DEFAULT 0, data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP)", function(err) { if (err) { console.error('Erro ao criar pre_verificacoes_email:', err.message); } });
  db.query("ALTER TABLE pre_verificacoes_email ADD COLUMN codigo VARCHAR(6) AFTER token", function(err) { if (err && !String(err.message).toLowerCase().includes('duplicate')) { console.error('Erro ao adicionar codigo em pre_verificacoes_email:', err.message); } });
  db.query("CREATE TABLE IF NOT EXISTS pre_verificacoes_whatsapp (id INT AUTO_INCREMENT PRIMARY KEY, telefone VARCHAR(20) NOT NULL UNIQUE, codigo VARCHAR(6) NOT NULL, verificado BOOLEAN DEFAULT 0, data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP)", function(err) { if (err) { console.error('Erro ao criar pre_verificacoes_whatsapp:', err.message); } });
  db.query("ALTER TABLE solicitacoes ADD COLUMN vista_profissional BOOLEAN DEFAULT FALSE", function(err) { if (err) { /* coluna já existe */ } });
  db.query("ALTER TABLE solicitacoes ADD COLUMN vista_pagamento_cliente BOOLEAN DEFAULT FALSE", function(err) { if (err) { /* coluna já existe */ } });
  // Garantir admin padrão
  setupBanco();
}

// ============================================
// Conecta/verifica o banco (e reconecta sozinho se cair)
// ============================================
function conectarBanco() {
  db.query('SELECT 1', function(err) {
    if (err) {
      if (dbConnected) {
        console.error('Falha ao conectar ao MySQL:', err.message);
      }
      dbConnected = false;
      // Tenta de novo em 5s (nao derruba o servidor)
      setTimeout(conectarBanco, 5000);
    } else {
      if (!dbConnected) {
        dbConnected = true;
        console.log('Conectado ao MySQL com sucesso!');
      }
      if (!setupJaFeito) {
        setupJaFeito = true;
        criarTabelas();
      }
    }
  });
}

// Manter a conexao acordada e detectar queda/retorno
setInterval(conectarBanco, 15000);

// Conexao inicial
conectarBanco();

// Rotas (passa getter para acompanhar status ao vivo da conexão)
app.use('/api/profissionais', require('./routes/profissionais')(db, () => dbConnected));
app.use('/api/solicitacoes', require('./routes/solicitacoes')(db, () => dbConnected));
app.use('/api/admin', require('./routes/admin')(db, () => dbConnected));
app.use('/api/orcamentos', require('./routes/orcamentos')(db, () => dbConnected));
app.use('/api/mensagens', require('./routes/mensagens')(db, () => dbConnected));
app.use('/api/upload', require('./routes/upload')());
app.use('/api/clientes', require('./routes/clientes')(db, () => dbConnected));
app.use('/api/pagamento', require('./routes/pagamento')(db, () => dbConnected));

// Mapa de rotas limpas (sem extensão .html)
const PAGINAS = {
  '/': 'index.html',
  '/index': 'index.html',
  '/contato': 'contato.html',
  '/sobre': 'sobre.html',
  '/cliente': 'cliente.html',
  '/profissional': 'profissional.html',
  '/cadastro': 'cadastro.html',
  '/termos': 'termos.html',
  '/politica': 'politica.html',
  '/painel': 'painel.html',
  '/categorias': 'categorias.html'
};

// ============================================
// Rota dinâmica: /cadastro/:profissao
// Serve o cadastro com metatags (og/twitter) específicas
// da profissão, para prévia personalizada ao compartilhar o link.
// O nome da profissão é normalizado e passado ao front-end
// via parâmetro de URL (?profissao=...) para pré-seleção no formulário.
// ============================================
app.get('/cadastro/:profissao', function(req, res) {
  var slug = decodeURIComponent(req.params.profissao).trim();
  var dados = profissoes.obterProfissao(slug);
  var urlCompleta = profissoes.URL_BASE + '/' + encodeURIComponent(slug);

  fs.readFile(path.join(__dirname, 'public', 'cadastro.html'), 'utf8', function(err, html) {
    if (err) {
      return res.sendFile(path.join(__dirname, 'public', 'cadastro.html'));
    }

    var titulo = dados.titulo;
    var descricao = dados.descricao;
    var imagem = dados.imagem;

    // Substitui as metatags dinâmicas (escapa para evitar quebra de HTML)
    function esc(attr) {
      return String(attr).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    html = html
      .replace(/<title>.*?<\/title>/, '<title>' + esc(titulo) + '</title>')
      .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(descricao) + '">')
      .replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(titulo) + '">')
      .replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(descricao) + '">')
      .replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(urlCompleta) + '">')
      .replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + esc(imagem) + '">')
      .replace(/<meta property="og:image:alt" content="[^"]*">/, '<meta property="og:image:alt" content="' + esc(titulo) + '">')
      .replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + esc(titulo) + '">')
      .replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + esc(descricao) + '">')
      .replace(/<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + esc(imagem) + '">');

    // Adiciona a profissão como parâmetro de URL para pré-seleção no cadastro
    html = html.replace(
      /(src="js\/cadastro\.js"[^>]*>)/,
      '$1<script>window.CADASTRO_PROFISSAO=' + JSON.stringify(slug) + ';</script>'
    );

    res.send(html);
  });
});

// Rota de fallback
app.get('*', function(req, res, next) {
  if (req.path.match(/\.(css|js|json|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  // Remove a extensão .html ao buscar no mapa (URLs adicionadas sem .html)
  var pathNome = req.path.replace(/\.html$/, '');
  var pagina = PAGINAS[pathNome];
  if (pagina) {
    return res.sendFile(path.join(__dirname, 'public', pagina));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use(function(err, req, res, next) {
  console.error('Erro:', err.message);
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

// Iniciar
var PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', function() {
  console.log('========================================');
  console.log('  Acheei - Servidor rodando');
  console.log('  http://localhost:' + PORT);
  console.log('========================================');
});

// ============================================
// Rotina de limpeza de solicitações expiradas
// - solicitações pagas: removidas após 5 dias
// - solicitações pendentes (não pagas): removidas após 15 dias
// Remoções automáticas são tratadas como rejeição do profissional
// e incrementam o contador `rejeicoes` para afetar a pontuação.
// Executa ao iniciar e a cada 6 horas.
// ============================================
function cleanupSolicitacoes() {
  if (!dbConnected) return;
  console.log('[cleanup] Verificando solicitações expiradas...');

  // Helper para processar um conjunto de solicitações selecionadas
  function processAndRemove(rows, label) {
    if (!rows || rows.length === 0) return;
    // Conta por profissional quantas solicitações serão removidas
    const counts = {};
    const ids = rows.map(r => r.id);
    rows.forEach(r => {
      const pid = r.profissional_id;
      counts[pid] = (counts[pid] || 0) + 1;
    });

    // Deleta as solicitações
    db.query('DELETE FROM solicitacoes WHERE id IN (?)', [ids], (err, del) => {
      if (err) {
        console.error('[cleanup] Erro ao deletar solicitações (' + label + '):', err);
        return;
      }
      console.log('[cleanup] Deletadas', ids.length, 'solicitações (', label, ')');

      // Para cada profissional, incrementa rejeicoes pelo número de exclusões
      Object.keys(counts).forEach(pid => {
        const inc = counts[pid];
        db.query('UPDATE profissionais SET rejeicoes = rejeicoes + ? WHERE id = ?', [inc, pid], (err2) => {
          if (err2) {
            console.error('[cleanup] Erro ao atualizar rejeições para profissional', pid, err2);
          } else {
            console.log('[cleanup] Incrementadas', inc, 'rejeições para profissional', pid);
          }
        });
      });
    });
  }

  // 1) Solicitações pagas com mais de 5 dias
  db.query("SELECT id, profissional_id FROM solicitacoes WHERE status_pagamento = 'pago' AND data_solicitacao <= NOW() - INTERVAL 5 DAY", (err, paidRows) => {
    if (err) {
      console.error('[cleanup] Erro ao buscar solicitações pagas expiradas:', err);
    } else {
      processAndRemove(paidRows, 'pago>5d');
    }
  });

  // 2) Solicitações pendentes com mais de 15 dias
  db.query("SELECT id, profissional_id FROM solicitacoes WHERE status_pagamento = 'pendente' AND data_solicitacao <= NOW() - INTERVAL 15 DAY", (err, pendRows) => {
    if (err) {
      console.error('[cleanup] Erro ao buscar solicitações pendentes expiradas:', err);
    } else {
      processAndRemove(pendRows, 'pendente>15d');
    }
  });
}

// Executa imediatamente ao iniciar e agenda execução periódica
setTimeout(cleanupSolicitacoes, 5 * 1000); // 5s após iniciar
setInterval(cleanupSolicitacoes, 1000 * 60 * 60 * 6); // a cada 6 horas
