const BASE = 'http://localhost:3000/api/profissionais';
const email = 'acheei.teste.verif' + Date.now() + '@gmail.com';
const cpf = '41624902448';

async function cadastrar() {
  const body = {
    cpf, data_nascimento: '1990-05-10', endereco: 'Rua Teste', numero: '100',
    bairro: 'Centro', cidade: 'Sao Paulo', estado: 'SP', cep: '01001-000',
    nome_perfil: 'Prof Teste Reenvio', foto_perfil: 'https://res.cloudinary.com/dzwkr47ib/image/upload/v1/acheei/perfis/teste.jpg',
    profissao: 'Eletricista', fotos_servicos: [], email, senha: 'teste123'
  };
  const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  console.log('CADASTRO_STATUS', r.status, 'ID', j.data && j.data.id);
}

async function pegarToken() {
  const db = require('mysql2').createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 1
  });
  const rows = await new Promise((res, rej) => db.query('SELECT token_verificacao FROM profissionais WHERE cpf = ?', [cpf], (e, r) => e ? rej(e) : res(r)));
  return rows[0] && rows[0].token_verificacao;
}

async function reenviar() {
  const r = await fetch(BASE + '/reenviar-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
  const j = await r.json();
  console.log('REENVIAR_STATUS', r.status, 'RESP', JSON.stringify(j));
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
  await cadastrar();
  const token1 = await pegarToken();
  console.log('TOKEN_INICIAL', token1 ? token1.slice(0, 12) + '...' : null);
  await reenviar();
  const token2 = await pegarToken();
  console.log('TOKEN_DEPOIS_REENVIO', token2 ? token2.slice(0, 12) + '...' : null);
  console.log('TOKEN_FOI_ATUALIZADO', token1 !== token2 && token2 !== null);
  await limpar();
  process.exit(0);
})().catch(e => { console.error('ERRO_TOTAL', e); process.exit(1); });
