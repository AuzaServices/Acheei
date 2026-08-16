const BASE = 'http://localhost:3000/api/profissionais';
const email = 'acheei.teste.step1.' + Date.now() + '@gmail.com';
const cpf = '41624902448'; // CPF valido de teste

async function verificarEmailInicial() {
  const r = await fetch(BASE + '/verificar-email-inicial', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
  });
  const j = await r.json();
  console.log('VERIFICAR_INICIAL_STATUS', r.status, JSON.stringify(j));
}

async function statusEmail() {
  const r = await fetch(BASE + '/status-verificacao-email?email=' + encodeURIComponent(email));
  const j = await r.json();
  console.log('STATUS_EMAIL', JSON.stringify(j));
  return j.verificado;
}

async function pegarTokenPre() {
  const db = require('mysql2').createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 1
  });
  const rows = await new Promise((res, rej) => db.query('SELECT token, verificado FROM pre_verificacoes_email WHERE email = ?', [email], (e, r) => e ? rej(e) : res(r)));
  console.log('PRE_VERIFICACAO_DB', JSON.stringify(rows));
  return rows[0];
}

async function confirmar(token) {
  const r = await fetch(BASE + '/confirmar-email?token=' + token);
  const text = await r.text();
  console.log('CONFIRMAR_STATUS', r.status, 'CONTEM_SUCESSO', text.includes('E-mail confirmado'));
}

async function tentarCadastroSemConfirmar() {
  const body = {
    cpf, data_nascimento: '1990-05-10', endereco: 'Rua Teste', numero: '100',
    bairro: 'Centro', cidade: 'Sao Paulo', estado: 'SP', cep: '01001-000',
    nome_perfil: 'Prof Teste Step1', foto_perfil: 'https://res.cloudinary.com/dzwkr47ib/image/upload/v1/acheei/perfis/teste.jpg',
    profissao: 'Eletricista', fotos_servicos: [], email: 'outroemail.' + Date.now() + '@gmail.com', senha: 'teste123'
  };
  const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  console.log('CADASTRO_SEM_CONFIRMAR_STATUS', r.status, JSON.stringify(j));
}

async function cadastrarComEmailConfirmado() {
  const body = {
    cpf, data_nascimento: '1990-05-10', endereco: 'Rua Teste', numero: '100',
    bairro: 'Centro', cidade: 'Sao Paulo', estado: 'SP', cep: '01001-000',
    nome_perfil: 'Prof Teste Step1', foto_perfil: 'https://res.cloudinary.com/dzwkr47ib/image/upload/v1/acheei/perfis/teste.jpg',
    profissao: 'Eletricista', fotos_servicos: [], email, senha: 'teste123'
  };
  const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  console.log('CADASTRO_COM_EMAIL_CONFIRMADO_STATUS', r.status, JSON.stringify(j));
  return j.data && j.data.id;
}

async function limpar() {
  const db = require('mysql2').createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 1, multipleStatements: true
  });
  await new Promise((res, rej) => db.query('DELETE FROM profissionais WHERE cpf = ?', [cpf], (e, r) => e ? rej(e) : res(r)));
  await new Promise((res, rej) => db.query('DELETE FROM pre_verificacoes_email WHERE email = ?', [email], (e, r) => e ? rej(e) : res(r)));
  console.log('LIMPO');
}

(async () => {
  require('dotenv').config();

  console.log('--- 1) Tentar cadastro completo SEM confirmar email (deve falhar 400) ---');
  await tentarCadastroSemConfirmar();

  console.log('--- 2) Iniciar verificacao de email no passo 1 ---');
  await verificarEmailInicial();

  console.log('--- 3) Checar status (deve ser false ainda) ---');
  await statusEmail();

  console.log('--- 4) Pegar token gerado e confirmar via link ---');
  const row = await pegarTokenPre();
  await confirmar(row.token);

  console.log('--- 5) Checar status de novo (deve ser true agora) ---');
  const verificado = await statusEmail();
  console.log('EMAIL_FOI_CONFIRMADO', verificado);

  console.log('--- 6) Cadastro completo (deve funcionar, pois email ja confirmado) ---');
  const id = await cadastrarComEmailConfirmado();
  console.log('PROFISSIONAL_CRIADO_ID', id);

  console.log('--- Limpando dados de teste ---');
  await limpar();
  process.exit(0);
})().catch(e => { console.error('ERRO_TOTAL', e); process.exit(1); });
