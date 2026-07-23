const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'lib', 'products.js');
let src = fs.readFileSync(file, 'utf8');
const PIDS = process.argv.slice(2).length ? process.argv.slice(2) : ['p2', 'p3', 'p9', 'p12', 'p13', 'p14', 'p25', 'p39'];
let changed = 0;
for (const pid of PIDS) {
  const idIdx = src.search(new RegExp("id:\\s*[\"']" + pid + "[\"']"));
  if (idIdx < 0) { console.log('NOT FOUND', pid); continue; }
  const after = src.slice(idIdx);
  const m = after.match(/img:\s*["'][^"']*["']/);
  if (!m) { console.log('NO IMG', pid); continue; }
  const abs = idIdx + m.index;
  const rep = "img: 'https://adamnoteve.com/mockups/" + pid + "-model.jpg'";
  src = src.slice(0, abs) + rep + src.slice(abs + m[0].length);
  changed++;
  console.log('swapped', pid);
}
fs.writeFileSync(file, src);
console.log('changed', changed);
