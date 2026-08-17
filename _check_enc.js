var fs = require('fs');
var b = fs.readFileSync('public/cadastro.html');
console.log('bytes', b.length);
console.log('BOM?', b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF);
var s = b.toString('utf8');
console.log('tem acento Area?', s.includes('Área'));
console.log('tem ?-subst', s.includes('\uFFFD'));
