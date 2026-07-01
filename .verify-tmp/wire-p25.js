// One-shot generator: wires all 83 Lost Tee colors into printful-mapping.js
// and products.js from the variant table fetched from Printful.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const table = JSON.parse(fs.readFileSync(path.join(__dirname, 'p25-variants.json'), 'utf8'));
const SIZES = ['S', 'M', 'L', 'XL', '2XL'];

const colors = Object.keys(table);
if (colors.length !== 83) throw new Error(`expected 83 colors, got ${colors.length}`);
for (const c of colors) {
  for (const s of SIZES) {
    if (!Number.isInteger(table[c][s])) throw new Error(`missing variant id for ${c}/${s}`);
  }
}

// Brand-first ordering for the site color picker; remainder alphabetical.
const featured = ['White', 'Black', 'Pink', 'Soft Cream', 'Athletic Heather'];
const rest = colors.filter((c) => !featured.includes(c)).sort();
const ordered = [...featured, ...rest];

// ---- printful-mapping.js ----
const mapPath = path.join(root, 'lib', 'printful-mapping.js');
let map = fs.readFileSync(mapPath, 'utf8');

const oldBlock = `
  // p25 = Lost Tee (Bella+Canvas 3001, White, S-2XL). Printful sync product 436904790.
  // Created 2026-06-06 via API; design designs/p25-lost-tee.png, $24 flat.
  'p25|S|White': { sync_variant_id: 5342581252 },
  'p25|M|White': { sync_variant_id: 5342581253 },
  'p25|L|White': { sync_variant_id: 5342581256 },
  'p25|XL|White': { sync_variant_id: 5342581257 },
  'p25|2XL|White': { sync_variant_id: 5342581258 },
};
`;
if (!map.includes(oldBlock)) throw new Error('old p25 block not found in printful-mapping.js');

const tableLines = ordered
  .map((c) => `  '${c}': [${SIZES.map((s) => table[c][s]).join(', ')}],`)
  .join('\n');

const newBlock = `};

// p25 = Lost Tee (Bella+Canvas 3001, 83 colors, S-2XL, $24 flat).
// Generated 2026-06-06 from Printful sync products:
//   436904790 (White) and 436908200/436908205 (light colors) -> black design designs/p25-lost-tee.png
//   436908216/436908220/436908229 (dark colors) -> white design designs/p25-lost-tee-white.png
// Split across 6 sync products because Printful caps each at 100 variants.
// Each row is [S, M, L, XL, 2XL].
const P25_SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const P25_COLOR_VARIANTS = {
${tableLines}
};
for (const [color, ids] of Object.entries(P25_COLOR_VARIANTS)) {
  P25_SIZES.forEach((size, i) => {
    MAPPING[\`p25|\${size}|\${color}\`] = { sync_variant_id: ids[i] };
  });
}
`;
map = map.replace(oldBlock, newBlock);
fs.writeFileSync(mapPath, map);
console.log('printful-mapping.js updated');

// ---- products.js ----
const prodPath = path.join(root, 'lib', 'products.js');
let prod = fs.readFileSync(prodPath, 'utf8');
const anchor = "id: 'p25'";
const idx = prod.indexOf(anchor);
if (idx === -1) throw new Error('p25 entry not found in products.js');
const colorsOld = "colors: ['White'],";
const colorsIdx = prod.indexOf(colorsOld, idx);
if (colorsIdx === -1) throw new Error('p25 colors line not found');

// 6 colors per line, indented to match the entry.
const lines = [];
for (let i = 0; i < ordered.length; i += 6) {
  lines.push('        ' + ordered.slice(i, i + 6).map((c) => `'${c}'`).join(', ') + ',');
}
const colorsNew = `colors: [\n${lines.join('\n')}\n      ],`;
prod = prod.slice(0, colorsIdx) + colorsNew + prod.slice(colorsIdx + colorsOld.length);
fs.writeFileSync(prodPath, prod);
console.log('products.js updated:', ordered.length, 'colors');
