-- ============================================
-- Acheei - Plataforma de Intermediação de Serviços
-- Script de Criação das Tabelas (compatível com FreeSQLDatabase)
-- Execute este script no phpMyAdmin / console do seu banco
-- ============================================

-- ============================================
-- Tabela: profissionais
-- ============================================
CREATE TABLE IF NOT EXISTS profissionais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  data_nascimento DATE NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  numero VARCHAR(20),
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  cep VARCHAR(9) NOT NULL,
  nome_perfil VARCHAR(100) NOT NULL,
  foto_perfil VARCHAR(255),
  profissao VARCHAR(100) NOT NULL,
  fotos_servicos LONGTEXT,
  status_aprovacao ENUM('pendente', 'aprovado', 'reprovado') DEFAULT 'pendente',
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR(100) UNIQUE,
  senha VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Tabela: solicitacoes
-- ============================================
CREATE TABLE IF NOT EXISTS solicitacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_nome VARCHAR(100) NOT NULL,
  cliente_telefone VARCHAR(20) NOT NULL,
  descricao TEXT NOT NULL,
  profissional_id INT NOT NULL,
  cliente_id INT,
  data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status_pagamento ENUM('pendente', 'pago') DEFAULT 'pendente',
  preference_id VARCHAR(100),
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Tabela: orcamentos
-- ============================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profissional_id INT NOT NULL,
  solicitacao_id INT,
  cliente_nome VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  status ENUM('pendente', 'aprovado', 'recusado') DEFAULT 'pendente',
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
  FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Tabela: mensagens (chat)
-- ============================================
CREATE TABLE IF NOT EXISTS mensagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitacao_id INT NOT NULL,
  remetente VARCHAR(50) NOT NULL,
  texto TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Tabela: admin
-- ============================================
CREATE TABLE IF NOT EXISTS admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Inserir administrador padrão
-- Usuario: admin | Senha: admin123
-- ============================================
INSERT INTO admin (usuario, senha) VALUES 
('admin', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGm6qOVqYKAFB1f5UqK8q')
ON DUPLICATE KEY UPDATE usuario = usuario;

-- ============================================
-- Tabela: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  push_subscription LONGTEXT,
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Tabela: avaliacoes
-- Uma avaliacao por solicitacao, feita pelo cliente apos a liberacao do chat
-- ============================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitacao_id INT NOT NULL UNIQUE,
  profissional_id INT NOT NULL,
  cliente_id INT NOT NULL,
  nota TINYINT NOT NULL,
  respeito ENUM('sim', 'parcialmente', 'nao') NOT NULL,
  comprometimento ENUM('sim', 'parcialmente', 'nao') NOT NULL,
  qualidade ENUM('sim', 'parcialmente', 'nao') NOT NULL,
  data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
