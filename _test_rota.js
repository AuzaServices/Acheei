require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 2,
  multipleStatements: true
});

const app = express();
app.use(bodyParser.json());

let dbConnected = true;
app.use('/api/profissionais', require('./routes/profissionais')(db, () => dbConnected));

// Error handler que loga o stack completo
app.use((err, req, res, next) => {
  console.error('ERRO_REAL:', err.stack || err.message || err);
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

app.listen(3456, () => {
  console.log('TESTE rodando na 3456');
  fetch('http://localhost:3456/api/profissionais/reenviar-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'naoexiste@teste.com' })
  }).then(r => r.text()).then(body => {
    console.log('RESPOSTA:', body);
    process.exit(0);
  }).catch(e => { console.error('FETCH_ERRO', e.message); process.exit(1); });
});
