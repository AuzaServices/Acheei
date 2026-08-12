const fs = require('fs');
const path = require('path');

const arquivos = [
  'public/index.html','public/contato.html','public/sobre.html','public/termos.html',
  'public/politica.html','public/cadastro.html','public/cliente.html','public/profissional.html',
  'public/painel.html','public/sw.js','public/js/main.js','public/js/cliente.js',
  'public/js/profissional.js','public/js/cadastro.js','public/js/painel.js','public/js/push.js',
  'public/js/mobile-menu.js','public/js/reveal.js','public/js/icons.js',
  'routes/mensagens.js','routes/pagamento.js','routes/profissionais.js','routes/solicitacoes.js',
  'routes/clientes.js','routes/admin.js','routes/orcamentos.js','routes/upload.js'
];

arquivos.forEach(rel => {
  const full = path.join(__dirname, rel);
  if (!fs.existsSync(full)) return;
  const buf = fs.readFileSync(full);

  // Verifica se é UTF-8 válido (sem replacement char)
  const utf8str = buf.toString('utf8');
  const temReplacement = utf8str.includes('\uFFFD');

  // Detecta mojibake comum (Ã§, Ã£, Ã©, etc.)
  const mojibake = /Ã§|Ã£|Ã©|Ãª|Ã­|Ã³|Ãº|Ã´|Ã±|Ã¢|Ã¦|Ã¬|Ã¹|Ã«|Ã¶|\uFFFd/i.test(utf8str);

  // Conta bytes > 127 (não-ASCII)
  let naoAscii = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] > 127) naoAscii++;

  // Detecta se tem BOM UTF-8
  const bom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;

  console.log(`${rel}`);
  console.log(`  BOM: ${bom} | Não-ASCII: ${naoAscii} | Replacement char: ${temReplacement} | Mojibake: ${mojibake}`);
});
