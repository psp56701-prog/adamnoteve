// Bump the ?v= cache-buster on regenerated on-model mockups.
//
// The mockup files are replaced in place at the same paths, so without a new
// ?v= the Netlify CDN and every returning visitor keep serving the OLD image —
// the deploy looks like a no-op. Run this after gen-onmodel-mockups.js.
//
//   node scripts/bump-mockup-version.js 20260804 p9 p31 p40 ...
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'lib', 'products.js');

const [version, ...pids] = process.argv.slice(2);
if (!version || !pids.length) {
  console.error('usage: node scripts/bump-mockup-version.js <version> <pid...>');
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');
let total = 0;
for (const pid of pids) {
  // Matches both `img:` and `imgByColor` refs; ?v= may or may not be present.
  const re = new RegExp(pid + '-model\\.jpg(\\?v=\\d+)?', 'g');
  src = src.replace(re, () => { total++; return pid + '-model.jpg?v=' + version; });
}
fs.writeFileSync(FILE, src);
console.log('rewrote', total, 'reference(s) across', pids.length, 'product(s) -> ?v=' + version);
