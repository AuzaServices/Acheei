// Script temporário para encontrar emojis no projeto
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public');
const files = [];

function walk(d) {
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(html|js|css)$/.test(e.name)) files.push(full);
  }
}
walk(dir);

// Ranges de emojis (Unicode)
const emojiRegex = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{FE0F}\u{2700}-\u{27BF}]/gu;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(emojiRegex);
  if (matches && matches.length > 0) {
    // unique emojis with count
    const counts = {};
    matches.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
    console.log(`\n=== ${path.relative(__dirname, f)} ===`);
    Object.entries(counts).forEach(([e, c]) => console.log(`  ${e} x${c}`));
  }
}

