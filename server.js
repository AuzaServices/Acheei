// ============================================
// Acheei - Servidor Principal
// Plataforma de Intermediacao de Servicos
// ============================================

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

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
// Conexao com MySQL (conexao unica + reconexao automatica)
// FreeSQLDatabase limita MUITO o numero de conexoes por usuario
// (max_user_connections, geralmente 5). Por isso usamos UMA unica
// conexao que reconecta sozinha quando cai. Isso evita tanto o
// "Banco de dados indisponivel" quanto o ER_TOO_MANY_USER_CONNECTIONS.
// ============================================
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'acheei',
  multipleStatements: true,
  connectTimeout: 10000
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
  // Garantir admin padrão
  setupBanco();
}

// ============================================
// Conecta ao banco (e reconecta sozinho se cair)
// ============================================
function conectarBanco() {
  db.connect(function(err) {
    if (err) {
      console.error('Falha ao conectar ao MySQL:', err.message);
      dbConnected = false;
      // Tenta de novo em 5s (nao derruba o servidor)
      setTimeout(conectarBanco, 5000);
    } else {
      dbConnected = true;
      console.log('Conectado ao MySQL com sucesso!');
      if (!setupJaFeito) {
        setupJaFeito = true;
        criarTabelas();
      }
    }
  });
}

// Se a conexao cair, marca como indisponivel e tenta reconectar
db.on('error', function(err) {
  console.error('Erro no banco de dados:', err.message);
  dbConnected = false;
  setTimeout(conectarBanco, 5000);
});

// Manter a conexao acordada e detectar queda/retorno
setInterval(function() {
  db.query('SELECT 1', function(err) {
    if (err) {
      if (dbConnected) {
        console.error('Conexao com o banco perdida - tentando reconectar...');
      }
      dbConnected = false;
    } else if (!dbConnected) {
      dbConnected = true;
      console.log('Conexao com o banco restabelecida!');
    }
  });
}, 15000);

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

// Rota de fallback
app.get('*', function(req, res, next) {
  if (req.path.match(/\.(css|js|json|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  var filePath = path.join(__dirname, 'public', req.path);
  var ext = path.extname(req.path);
  if (ext === '.html') {
    return res.sendFile(filePath, function(err) {
      if (err) res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
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
