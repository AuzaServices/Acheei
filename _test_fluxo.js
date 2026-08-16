const BASE = 'http://localhost:3000/api/profissionais';
const ADMIN = 'http://localhost:3000/api/admin';
const email = 'acheei.teste.verif' + Date.now() + '@gmail.com';
const cpf = '41624902448';
let adminToken = null;

async function loginAdmin() {
  const r = await fetch(ADMIN + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'admin', senha: 'admin123' }) });
  const j = await r.json();
  adminToken = j.data && j.data.token;
  console.log('ADMIN_LOGIN_SUCCESS', j.success);
}

async function cadastrar() {
  const body = {
    cpf, data_nascimento: '1990-05-10', endereco: 'Rua Teste', numero: '100',
    bairro: 'Centro', cidade: 'Sao Paulo', estado: 'SP', cep: '01001-000',
    nome_perfil: 'Prof Teste Aprovado', foto_perfil: 'https://res.cloudinary.com/dzwkr47ib/image/upload/v1/acheei/perfis/teste.jpg',
    profissao: 'Eletricista', fotos_servicos: [], email, senha: 'teste123'
  };
  const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  console.log('CADASTRO_STATUS', r.status, 'ID', j.data && j.data.id);
  return j.data && j.data.id;
}

async function aprovar(id) {
  const r = await fetch(ADMIN + '/aprovar/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken } });
  const j = await r.json();
  console.log('APROVAR_SUCCESS', j.success);
}

async function login(emailV) {
  const r = await fetch(BASE + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailV, senha: 'teste123' }) });
  const j = await r.json();
  console.log('LOGIN_STATUS', r.status, 'MSG', j.message);
  return j;
}

async function pegarToken() {
  const db = require('mysql2').createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 1
  });
  const rows = await new Promise((res, rej) => db.query('SELECT token_verificacao FROM profissionais WHERE cpf = ?', [cpf], (e, r) => e ? rej(e) : res(r)));
  return rows[0] && rows[0].token_verificacao;
}

async function confirmar(token) {
  const r = await fetch(BASE + '/confirmar-email?token=' + token);
  const text = await r.text();
  console.log('CONFIRMAR_STATUS', r.status, 'SUCESSO', text.includes('E-mail confirmado') || text.includes('já foi confirmado'));
}

async function limpar() {
  const db = require('mysql2').createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 1, multipleStatements: true
  });
  await new Promise((res, rej) => db.query('DELETE FROM profissionais WHERE cpf = ?', [cpf], (e, r) => e ? rej(e) : res(r)));
  console.log('LIMPO');
}

(async () => {
  require('dotenv').config();
  await loginAdmin();
  const id = await cadastrar();
  await aprovar(id);
  console.log('--- Login com email NAO confirmado (aprovado) ---');
  const r1 = await login(email);
  const token = await pegarToken();
  await confirmar(token);
  console.log('--- Login com email confirmado ---');
  const r2 = await login(email);
  console.log('LOGIN_FINAL_SUCCESS', r2.success);
  await limpar();
  process.exit(0);
})().catch(e => { console.error('ERRO_TOTAL', e); process.exit(1); });
