// Generate on-model (lifestyle) mockups for premium apparel via Printful v2 API,
// download them into mockups/, save as JPG. Prefers a WHITE/light garment and uses
// each variant's OWN stored design (correct ink for that color). Reusable pipeline.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const KEY = (fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^PRINTFUL_API_KEY=(.+)$/m) || [])[1].trim().replace(/['"]/g, '');
const { PRODUCTS } = require(path.join(ROOT, 'lib', 'products.js'));

const H = { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pf(url, opts = {}) {
  const r = await fetch(url.startsWith('http') ? url : 'https://api.printful.com' + url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  return r.json();
}

// Pass target pids as CLI args, else default set.
const TARGET = process.argv.slice(2).length ? process.argv.slice(2) : ['p2', 'p14', 'p35', 'p36', 'p46', 'p54'];
// Human on-model style categories, in rotation-preference order (interleaves
// women's/men's so a shared blank alternates people). Flat Lifestyle is a
// last-resort fallback (it's a flat-lay, not a model).
const HUMAN_STYLES = ["Women's Lifestyle", "Men's Lifestyle", "Women's", "Men's", "On model", "Lifestyle"];

// COLOR PICK — colorful, never black. Lower = preferred.
// Each sync variant carries its own stored design (correct ink per color),
// so colorful/dark garments still render the artwork correctly.
function colorScore(name) {
  const n = (name || '').toLowerCase();
  if (/oxblood black|\bblack\b/.test(n)) return 90;                                                   // black — last resort only
  if (/(light pink|azalea|heliconia|\bpink\b|rose|fuchsia|raspberry|berry|magenta)/.test(n)) return 0; // brand pink first
  if (/(red|orange|royal|sapphire|carolina blue|light blue|sky|aqua|teal|purple|violet|irish green|kelly|green(?!.*forest)|yellow|gold|coral|turquoise)/.test(n)) return 1; // vivid
  if (/(maroon|oxblood|forest|military green|army|olive|burgundy|wine|navy)/.test(n)) return 2;        // colorful jewel tones (not black)
  if (/(sand|natural|cream|ivory|bone|oatmeal|almond|heather|sport grey|ash|dusty|mint|lavender|powder)/.test(n)) return 4; // warm neutrals
  if (/white/.test(n)) return 5;                                                                       // white fallback
  if (/(charcoal|asphalt|graphite|dark grey|dark heather|slate)/.test(n)) return 8;                   // dark greys — avoid
  return 6;
}

(async () => {
  let sync = [];
  for (const off of [0, 100]) { const d = await pf('/store/products?limit=100&offset=' + off); (d.result || []).forEach((x) => sync.push(x)); }
  console.log('sync products fetched:', sync.length);
  const results = [];
  let gidx = 0; // global rotation index across ALL products, so both model and garment color vary across the grid
  for (const pid of TARGET) {
    try {
      const prod = PRODUCTS.find((x) => x.id === pid);
      if (!prod) { results.push({ pid, status: 'no-site-product' }); continue; }
      const norm = (x) => x.toLowerCase().replace(/\s*\((value|\d+\/\d+)\)\s*$/i, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      const base = norm(prod.name);
      const matches = sync.filter((s) => { const sn = norm(s.name); return sn.length > 6 && (sn === base || sn.startsWith(base) || base.startsWith(sn)); });
      if (!matches.length) { results.push({ pid, name: prod.name, status: 'no-sync-match' }); continue; }
      let variants = [];
      for (const sm of matches) {
        const det = await pf('/store/products/' + sm.id);
        (det.result && det.result.sync_variants || []).forEach((v) => {
          const df = (v.files || []).find((f) => f.type === 'default');
          if (df && df.url) variants.push({ name: v.name, variant_id: v.variant_id, cpid: v.product.product_id, design: df.url });
        });
      }
      if (!variants.length) { results.push({ pid, name: prod.name, status: 'no-variants' }); continue; }
      // --- COLOR: respect a curated colorful featuredColor; else pick the best colorful (non-black) variant ---
      let best = null;
      const fc = (prod.featuredColor || '').toLowerCase();
      if (fc && colorScore(fc) < 8) best = variants.find((v) => v.name.toLowerCase().includes(fc));
      if (!best) {
        // No curated color: rotate among the equally-most-colorful (non-black) options so the premium
        // dark-only line doesn't come out all-navy — it varies navy/maroon/forest across products.
        variants.sort((a, b) => colorScore(a.name) - colorScore(b.name));
        const top = colorScore(variants[0].name);
        const tied = variants.filter((v) => colorScore(v.name) === top);
        best = tied[gidx % tied.length];
      }

      const st = await pf('/v2/catalog-products/' + best.cpid + '/mockup-styles');
      const groups = st.data || [];
      // --- MODEL: gather all human on-model FRONT styles, then ROTATE globally so the grid shows different people ---
      let cands = [];
      for (const g of groups) if (g.placement === 'front') for (const s of (g.mockup_styles || [])) if (s.view_name === 'Front' && HUMAN_STYLES.includes(s.category_name)) cands.push({ id: s.id, cat: s.category_name });
      cands.sort((a, b) => (HUMAN_STYLES.indexOf(a.cat) - HUMAN_STYLES.indexOf(b.cat)) || (a.id - b.id));
      if (!cands.length) for (const g of groups) if (g.placement === 'front') for (const s of (g.mockup_styles || [])) if (s.view_name === 'Front' && s.category_name === 'Flat Lifestyle') cands.push({ id: s.id, cat: 'Flat Lifestyle' });
      if (!cands.length) { results.push({ pid, name: prod.name, cpid: best.cpid, status: 'no-onmodel-style' }); continue; }
      const pick = cands[gidx % cands.length];
      const chosen = pick.id, chosenCat = pick.cat;
      gidx++;
      const body = { format: 'jpg', products: [{ source: 'catalog', mockup_style_ids: [chosen], catalog_product_id: best.cpid, catalog_variant_ids: [best.variant_id], placements: [{ placement: 'front', technique: 'dtg', layers: [{ type: 'file', url: best.design }] }] }] };
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
      results.push({ pid, name: prod.name, style: chosenCat, variant: best.name, file: out, bytes: buf.length, status: 'ok' });
      console.log('OK', pid, '|', prod.name, '|', chosenCat, '|', best.name, '->', out, buf.length + 'b');
    } catch (e) { results.push({ pid, status: 'exception', err: String(e).slice(0, 200) }); console.log('EXC', pid, e.message); }
    await sleep(2500); // be gentle with Printful's mockup rate limit
  }
  try { fs.writeFileSync(path.join(ROOT, 'scratch-onmodel-results.json'), JSON.stringify(results, null, 2)); } catch (e) {}
  console.log('\n=== SUMMARY ===');
  results.forEach((r) => console.log(String(r.status).padEnd(18), r.pid, '|', r.name || '', r.file ? '-> ' + r.file : (r.fail || r.err || '')));
})();
