// Adds imgByColor (color -> Printful mockup URL) to the p25 entry in products.js.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const previews = JSON.parse(fs.readFileSync(path.join(__dirname, 'p25-previews.json'), 'utf8'));
const colors = Object.keys(previews);
if (colors.length !== 83) throw new Error(`expected 83 previews, got ${colors.length}`);

const prodPath = path.join(root, 'lib', 'products.js');
let prod = fs.readFileSync(prodPath, 'utf8');

const idx = prod.indexOf("id: 'p25'");
if (idx === -1) throw new Error('p25 not found');
if (prod.includes('imgByColor')) throw new Error('imgByColor already present — aborting to avoid duplicate');

// Insert right after the img: '...' line of p25.
const imgLineEnd = prod.indexOf('\n', prod.indexOf("img: '", idx));
if (imgLineEnd === -1) throw new Error('p25 img line not found');

const entries = colors
  .map((c) => `        '${c}': '${previews[c]}',`)
  .join('\n');
const block = `\n      // Per-color Printful mockups (generated 2026-06-06). PDP swaps the photo\n      // to match the selected color; falls back to img when a color is missing.\n      imgByColor: {\n${entries}\n      },`;

prod = prod.slice(0, imgLineEnd) + block + prod.slice(imgLineEnd);
fs.writeFileSync(prodPath, prod);
console.log('imgByColor added with', colors.length, 'colors');
