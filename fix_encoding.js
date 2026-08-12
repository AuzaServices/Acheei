// ============================================
// Script para corrigir encoding (mojibake) APENAS nos HTMLs
// Os arquivos HTML têm mojibake UTF-8 duplo (ex: "ConfianÃ§a" deveria ser "Confiança").
// Os arquivos JS/routes estão em UTF-8 correto e NÃO devem ser tocados.
//
// Correção para mojibake duplo:
//   bytes: C3 83 C2 A7  ->  ler como UTF8 -> "Ã§" (U+00C3 U+00A7)
//   -> interpretar como Latin-1 -> bytes C3 A7 -> ler como UTF8 -> "ç"
// ============================================
const fs = require('fs');
const path = require('path');

const arquivos = [
  'public/index.html',
  'public/contato.html',
  'public/sobre.html',
  'public/termos.html',
  'public/politica.html',
  'public/cadastro.html',
  'public/cliente.html',
  'public/profissional.html',
  'public/painel.html'
];

let totalCorrigidos = 0;

arquivos.forEach(rel => {
  const full = path.join(__dirname, rel);
  if (!fs.existsSync(full)) {
    console.log(`[IGNORADO] ${rel} (não existe)`);
    return;
  }

  // Lê como UTF-8 (string contém mojibake, ex: "ConfianÃ§a")
  const original = fs.readFileSync(full, 'utf8');

  // Aplica correção: interpreta a string mojibake como Latin-1
  // para recuperar os bytes UTF-8 originais, depois decodifica como UTF-8
  const corrigido = Buffer.from(original, 'latin1').toString('utf8');

  if (corrigido !== original) {
    fs.writeFileSync(full, corrigido, 'utf8');
    totalCorrigidos++;
    console.log(`[CORRIGIDO] ${rel}`);
  } else {
    console.log(`[OK] ${rel}`);
  }
});

console.log(`\nTotal de arquivos HTML corrigidos: ${totalCorrigidos}`);
console.log('IMPORTANTE: Arquivos JS/routes NÃO foram alterados (estão em UTF-8 correto).');
