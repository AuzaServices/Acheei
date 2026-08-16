const BASE = 'http://localhost:3000/api/profissionais';
const email = 'acheei.teste.codigo.' + Date.now() + '@gmail.com';
const cpf = '41624902448';

async function verificarEmailInicial() {
  const r = await fetch(BASE + '/verificar-email-inicial', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
  });
  const j = await r.json();
  console.log('VERIFICAR_INICIAL_STATUS', r.status, JSON.stringify(j));
}

async function pegarCodigo() {
  const db = require('mysql2').createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 1
  });
  const rows = await new Promise((res, rej) => db.query('SELECT token, codigo, verificado FROM pre_verificacoes_email WHERE email = ?', [email], (e, r) => e ? rej(e) : res(r)));
  console.log('DB_ROW', JSON.stringify(rows));
  return rows[0];
}

async function confirmarCodigoErrado() {
  const r = await fetch(BASE + '/confirmar-codigo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, codigo: '000000' })
  });
  const j = await r.json();
  console.log('CODIGO_ERRADO_STATUS', r.status, JSON.stringify(j));
}

async function confirmarCodigoCorreto(codigo) {
  const r = await fetch(BASE + '/confirmar-codigo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, codigo })
  });
  const j = await r.json();
  console.log('CODIGO_CORRETO_STATUS', r.status, JSON.stringify(j));
}

async function statusEmail() {
  const r = await fetch(BASE + '/status-verificacao-email?email=' + encodeURIComponent(email));
  const j = await r.json();
  console.log('STATUS_EMAIL', JSON.stringify(j));
}

async function limpar() {
  const db = require('mysql2').createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME, connectionLimit: 1
  });
  await new Promise((res, rej) => db.query('DELETE FROM pre_verificacoes_email WHERE email = ?', [email], (e, r) => e ? rej(e) : res(r)));
  console.log('LIMPO');
}

(async () => {
  require('dotenv').config();
  console.log('--- 1) Iniciar verificacao (gera token + codigo, envia email) ---');
  await verificarEmailInicial();

  console.log('--- 2) Pegar codigo gerado no banco ---');
  const row = await pegarCodigo();

  console.log('--- 3) Tentar codigo errado (deve falhar) ---');
  await confirmarCodigoErrado();

  console.log('--- 4) Confirmar com codigo correto ---');
  await confirmarCodigoCorreto(row.codigo);

  console.log('--- 5) Checar status final (deve ser true) ---');
  await statusEmail();

  await limpar();
  process.exit(0);
})().catch(e => { console.error('ERRO_TOTAL', e); process.exit(1); });
