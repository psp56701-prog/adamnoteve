// Wires all 13 newly-created Printful products into printful-mapping.js and products.js.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'new-variants.json'), 'utf8'));

const SIZES = ['S', 'M', 'L', 'XL', '2XL'];
// Printful size label -> site size label
const RELABEL = { '3″×3″': '3"', '4″×4″': '4"', '5.5″×5.5″': '5.5"', '12″×18″': '12"x18"', '12″×22″': '12"x22"', '16″×32″': '16"x32"' };
const relabel = (s) => RELABEL[s] || s;

const CFG = {
  p2:  { shape: 'sizecolor', featured: ['White', 'Black', 'Light Pink', 'Sand', 'Sport Grey'] },
  p14: { shape: 'sizecolor', featured: ['White', 'Black', 'Light Pink', 'Sand', 'Sport Grey'] },
  p9:  { shape: 'sizecolor', featured: ['Light Pink', 'Heliconia', 'White', 'Black', 'Sport Grey'] },
  p12: { shape: 'sizecolor', featured: ['White', 'Black', 'Sport Grey', 'Light Pink', 'Sand'] },
  p3:  { shape: 'sizecolor', featured: ['White', 'Black', 'Pink', 'Soft Cream', 'Athletic Heather'] },
  p13: { shape: 'sizecolor', featured: ['White', 'Black', 'Pink', 'Soft Cream', 'Athletic Heather'] },
  p5:  { shape: 'coloronly', featured: ['Natural', 'Classic Pink', 'Black', 'Mint', 'Mustard'], price: 22 },
  p6:  { shape: 'sizeonly', priceBySize: { '3"': 8, '4"': 10, '5.5"': 12 }, price: 8 },
  p8:  { shape: 'sizeonly', price: 20 },
  p11: { shape: 'coloronly', featured: ['White', 'Black'], price: 34 },
  p17: { shape: 'coloronly', featured: ['White', 'Pink', 'Mint', 'Black', 'Navy'], price: 32 },
  p18: { shape: 'single', price: 22 },
  p23: { shape: 'sizeonly', priceBySize: { '12"x18"': 28, '12"x22"': 32, '16"x32"': 44 }, price: 28 },
};

function orderColors(colors, featured) {
  const rest = colors.filter((c) => !featured.includes(c)).sort();
  return [...featured.filter((c) => colors.includes(c)), ...rest];
}

// ---------- build mapping code + per-product wiring data ----------
let mapCode = '\n// ============================================================\n';
mapCode += '// Store-fill launch (generated 2026-06-06): p2,p3,p5,p6,p8,p9,p11,p12,p13,p14,p17,p18,p23\n';
mapCode += '// Typographic designs; dark/pink surfaces get inverted design files.\n';
mapCode += '// ============================================================\n';

const wiring = {}; // pid -> { colors, imgByColor, sizes, img }

for (const [pid, cfg] of Object.entries(CFG)) {
  const rows = data[pid];
  if (cfg.shape === 'sizecolor') {
    const byColor = {};
    for (const r of rows) {
      byColor[r.color] = byColor[r.color] || { sizes: {}, preview: null };
      byColor[r.color].sizes[r.size] = r.id;
      if (!byColor[r.color].preview && r.preview) byColor[r.color].preview = r.preview;
    }
    const colors = orderColors(Object.keys(byColor), cfg.featured);
    for (const c of colors) for (const s of SIZES) {
      if (!Number.isInteger(byColor[c].sizes[s])) throw new Error(`${pid} missing ${s}/${c}`);
    }
    const T = pid.toUpperCase();
    mapCode += `\nconst ${T}_COLOR_VARIANTS = {\n`;
    mapCode += colors.map((c) => `  '${c}': [${SIZES.map((s) => byColor[c].sizes[s]).join(', ')}],`).join('\n');
    mapCode += `\n};\nfor (const [color, ids] of Object.entries(${T}_COLOR_VARIANTS)) {\n`;
    mapCode += `  ['S', 'M', 'L', 'XL', '2XL'].forEach((size, i) => {\n`;
    mapCode += `    MAPPING[\`${pid}|\${size}|\${color}\`] = { sync_variant_id: ids[i] };\n  });\n}\n`;
    const imgByColor = {};
    for (const c of colors) imgByColor[c] = byColor[c].preview;
    wiring[pid] = { colors, imgByColor, sizes: SIZES, img: imgByColor[colors[0]] };
  } else if (cfg.shape === 'coloronly') {
    const colors = orderColors(rows.map((r) => r.color), cfg.featured);
    mapCode += `\n// ${pid}: one size per color\n`;
    const imgByColor = {};
    for (const c of colors) {
      const r = rows.find((x) => x.color === c);
      mapCode += `MAPPING['${pid}||${c}'] = { sync_variant_id: ${r.id} };\n`;
      imgByColor[c] = r.preview;
    }
    wiring[pid] = { colors, imgByColor, sizes: null, img: imgByColor[colors[0]], price: cfg.price };
  } else if (cfg.shape === 'sizeonly') {
    const sizes = rows.map((r) => relabel(r.size));
    mapCode += `\n// ${pid}: one variant per size/model\n`;
    for (const r of rows) mapCode += `MAPPING['${pid}|${relabel(r.size)}|'] = { sync_variant_id: ${r.id} };\n`;
    wiring[pid] = { colors: null, imgByColor: null, sizes, img: rows[0].preview, price: cfg.price, priceBySize: cfg.priceBySize };
  } else {
    mapCode += `\nMAPPING['${pid}||'] = { sync_variant_id: ${rows[0].id} };\n`;
    wiring[pid] = { colors: null, imgByColor: null, sizes: null, img: rows[0].preview, price: cfg.price };
  }
  if (cfg.price) wiring[pid].price = cfg.price;
  if (cfg.priceBySize) wiring[pid].priceBySize = cfg.priceBySize;
}

// ---------- printful-mapping.js ----------
const mapPath = path.join(root, 'lib', 'printful-mapping.js');
let map = fs.readFileSync(mapPath, 'utf8');
const anchor = 'function getPrintfulVariant(';
if (!map.includes(anchor)) throw new Error('mapping anchor not found');
if (map.includes('P2_COLOR_VARIANTS')) throw new Error('already wired');
map = map.replace(anchor, mapCode + '\n' + anchor);
fs.writeFileSync(mapPath, map);
console.log('printful-mapping.js: mapping blocks added');

// ---------- products.js ----------
const prodPath = path.join(root, 'lib', 'products.js');
let prod = fs.readFileSync(prodPath, 'utf8');

function productSlice(pid) {
  const start = prod.indexOf(`id: '${pid}'`);
  if (start === -1) throw new Error(`${pid} not found`);
  const next = prod.indexOf("id: 'p", start + 5);
  const end = next === -1 ? prod.indexOf('];', start) : next;
  return [start, end];
}

function fmtColors(colors) {
  const lines = [];
  for (let i = 0; i < colors.length; i += 5) {
    lines.push('        ' + colors.slice(i, i + 5).map((c) => `'${c}'`).join(', ') + ',');
  }
  return `colors: [\n${lines.join('\n')}\n      ],`;
}
function fmtImgByColor(m) {
  const lines = Object.entries(m).map(([c, u]) => `        '${c}': '${u}',`);
  return `imgByColor: {\n${lines.join('\n')}\n      },`;
}

for (const [pid, w] of Object.entries(wiring)) {
  let [start, end] = productSlice(pid);
  let slice = prod.slice(start, end);

  // live flag after name
  if (!/live: true/.test(slice)) slice = slice.replace(/(name: '[^']+',\n)/, `$1      live: true,\n`);
  // price + priceBySize
  if (w.price != null) {
    slice = slice.replace(/price: [\d.]+,/, `price: ${w.price},`);
  }
  slice = slice.replace(/\n\s+priceBySize: \{[^}]*\},/, '');
  if (w.priceBySize) {
    const pbs = Object.entries(w.priceBySize).map(([s, v]) => `'${s}': ${v}`).join(', ');
    slice = slice.replace(/(price: [\d.]+,)/, `$1\n      priceBySize: { ${pbs} },`);
  }
  // sizes
  if (w.sizes) {
    const sz = `sizes: [${w.sizes.map((s) => `'${s}'`).join(', ')}],`;
    if (/sizes: [^\n]+,/.test(slice)) slice = slice.replace(/sizes: [^\n]+,/, sz);
    else slice = slice.replace(/(category: '[^']+',\n)/, `$1      ${sz}\n`);
  }
  // colors
  if (w.colors) {
    if (/colors: [^\n]+,/.test(slice)) slice = slice.replace(/colors: [^\n]+,/, fmtColors(w.colors));
    else slice = slice.replace(/(features: \[)/, `${fmtColors(w.colors)}\n      $1`);
  } else {
    slice = slice.replace(/\n\s+colors: [^\n]+,/, '');
  }
  // img
  slice = slice.replace(/img: '[^']+',/, `img: '${w.img}',`);
  // imgByColor
  slice = slice.replace(/\n\s+imgByColor: \{[\s\S]*?\n\s+\},/, '');
  if (w.imgByColor) slice = slice.replace(/(img: '[^']+',)/, `$1\n      ${fmtImgByColor(w.imgByColor)}`);

  prod = prod.slice(0, start) + slice + prod.slice(end);
}
fs.writeFileSync(prodPath, prod);
console.log('products.js: 13 products wired live');
