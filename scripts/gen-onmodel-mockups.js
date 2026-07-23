// Generate on-model (lifestyle) mockups for premium apparel via Printful v2 API,
// download them into mockups/, and record a pid -> file map.
// Value tees (Gildan, flat-only) are intentionally excluded.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const KEY = (fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^PRINTFUL_API_KEY=(.+)$/m) || [])[1].trim().replace(/['"]/g, '');
const { PRODUCTS } = require(path.join(ROOT, 'lib', 'products.js'));
const DESIGNS_DIR = path.join(ROOT, 'designs');

const H = { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pf(url, opts = {}) {
  const r = await fetch(url.startsWith('http') ? url : 'https://api.printful.com' + url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  return r.json();
}

const TARGET = ['p2', 'p3', 'p9', 'p12', 'p13', 'p14', 'p25', 'p39'];
const STYLE_PREF = ["Women's Lifestyle", "Women's", "Men's Lifestyle", "Flat Lifestyle", "Men's"];

function designUrlFor(pid) {
  const n = pid.replace('p', '');
  const files = fs.readdirSync(DESIGNS_DIR).filter((f) => new RegExp('^p' + n + '[-_.]').test(f) && /\.png$/i.test(f));
  const pick = files.find((f) => /light/i.test(f)) || files.find((f) => /white/i.test(f)) || files.find((f) => !/dark|pink/i.test(f)) || files[0];
  return pick ? 'https://adamnoteve.com/designs/' + pick : null;
}

(async () => {
  let sync = [];
  for (const off of [0, 100]) { const d = await pf('/store/products?limit=100&offset=' + off); (d.result || []).forEach((x) => sync.push(x)); }
  console.log('sync products fetched:', sync.length);
  const results = [];
  for (const pid of TARGET) {
    try {
      const prod = PRODUCTS.find((x) => x.id === pid);
      if (!prod) { results.push({ pid, status: 'no-site-product' }); continue; }
      const design = designUrlFor(pid);
      if (!design) { results.push({ pid, name: prod.name, status: 'no-design-file' }); continue; }
      const base = prod.name.toLowerCase();
      const m = sync.find((s) => s.name.toLowerCase().replace(/\s*\(\d+\/\d+\)\s*$/, '') === base) || sync.find((s) => s.name.toLowerCase().startsWith(base));
      if (!m) { results.push({ pid, name: prod.name, status: 'no-sync-match' }); continue; }
      const det = await pf('/store/products/' + m.id);
      const vs = (det.result && det.result.sync_variants) || [];
      if (!vs.length) { results.push({ pid, name: prod.name, status: 'no-variants' }); continue; }
      const cpid = vs[0].product.product_id;
      const wv = vs.find((v) => /white/i.test(v.name)) || vs.find((v) => /(heather|ash|cream|natural|light)/i.test(v.name)) || vs[0];
      const st = await pf('/v2/catalog-products/' + cpid + '/mockup-styles');
      const groups = st.data || [];
      let chosen = null, chosenCat = null;
      outer: for (const pref of STYLE_PREF) for (const g of groups) if (g.placement === 'front') for (const s of (g.mockup_styles || [])) if (s.view_name === 'Front' && s.category_name === pref) { chosen = s.id; chosenCat = pref; break outer; }
      if (!chosen) { results.push({ pid, name: prod.name, cpid, status: 'no-onmodel-style' }); continue; }
      const body = { format: 'jpg', products: [{ source: 'catalog', mockup_style_ids: [chosen], catalog_product_id: cpid, catalog_variant_ids: [wv.variant_id], placements: [{ placement: 'front', technique: 'dtg', layers: [{ type: 'file', url: design }] }] }] };
      const task = await pf('/v2/mockup-tasks', { method: 'POST', body: JSON.stringify(body) });
      const tid = task.data && task.data[0] && task.data[0].id;
      if (!tid) { results.push({ pid, name: prod.name, status: 'task-create-fail', err: JSON.stringify(task).slice(0, 200) }); continue; }
      let url = null, fail = null;
      for (let i = 0; i < 15; i++) {
        await sleep(4000);
        const r = await pf('/v2/mockup-tasks?id=' + tid);
        const t = r.data && r.data[0]; if (!t) continue;
        if (t.status === 'completed') { const mk = (t.catalog_variant_mockups || [])[0]; const fr = mk && (mk.mockups || []).find((x) => x.placement === 'front'); url = fr && fr.mockup_url; break; }
        if (t.status === 'failed') { fail = JSON.stringify(t.failure_reasons); break; }
      }
      if (!url) { results.push({ pid, name: prod.name, status: 'gen-fail', fail }); continue; }
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const out = 'mockups/' + pid + '-model.jpg';
      fs.writeFileSync(path.join(ROOT, out), buf);
      results.push({ pid, name: prod.name, style: chosenCat, variant: wv.name, file: out, bytes: buf.length, status: 'ok' });
      console.log('OK', pid, '|', prod.name, '|', chosenCat, '|', wv.name, '->', out, buf.length + 'b');
    } catch (e) { results.push({ pid, status: 'exception', err: String(e).slice(0, 200) }); console.log('EXC', pid, e.message); }
  }
  fs.writeFileSync(path.join(ROOT, 'scratch-onmodel-results.json'), JSON.stringify(results, null, 2));
  console.log('\n=== SUMMARY ===');
  results.forEach((r) => console.log(String(r.status).padEnd(18), r.pid, '|', r.name || '', r.file ? '-> ' + r.file : (r.fail || r.err || '')));
})();
