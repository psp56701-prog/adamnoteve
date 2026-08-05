// Generate on-model (lifestyle) mockups for premium apparel via Printful v2 API,
// download them into mockups/, save as JPG. Prefers a WHITE/light garment and uses
// each variant's OWN stored design (correct ink for that color). Reusable pipeline.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const KEY = (fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^PRINTFUL_API_KEY=(.+)$/m) || [])[1].trim().replace(/['"]/g, '');
const { PRODUCTS } = require(path.join(ROOT, 'lib', 'products.js'));
const { isStudioWhite, cornerLuma } = require(path.join(ROOT, 'lib', 'bg-check.js'));
const { darkenStudioBg, alphaCover, MIN_ALPHA_COVER } = require(path.join(__dirname, 'dark-studio-bg.js'));
const { execFileSync } = require('child_process');

const H = { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pf(url, opts = {}) {
  const r = await fetch(url.startsWith('http') ? url : 'https://api.printful.com' + url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  return r.json();
}

// Pass target pids as CLI args, else default set.
const TARGET = process.argv.slice(2).length ? process.argv.slice(2) : ['p2', 'p14', 'p35', 'p36', 'p46', 'p54'];
// Human on-model style categories. This MUST be a pattern, not a fixed list:
// Printful numbers its extra people ("Men's Lifestyle 2", "Women's 3"), and an
// exact-match list silently threw all of them away — which is how ~20 value
// tees ended up sharing two photos.
const HUMAN_STYLE = /^(Men's|Women's)(\s+Lifestyle)?(\s+\d+)?$/i;
const SCENE_STYLE = /Lifestyle/i;   // shot in a room; the rest are studio cutouts

// Styles where something is worn OVER the tee and covers the print. The whole
// point of the shot is the artwork, so these are never usable no matter how
// much model variety we're short on.
//   727  (Gildan 64000)     — puffer vest, zipped over the design
//   1128 (Bella+Canvas 3001) — open olive overshirt across both sides of the print
const BANNED_STYLE_IDS = new Set([727, 1128]);

// Full-body/distant framing: the garment is legible but the print is tiny, so
// these are a last resort rather than part of the main rotation.
const DISTANT_STYLE_IDS = new Set([1127]);

// Mean corner luma above which an opaque room shot is too bright to sit in the
// dark shop grid. See the reject branch below for how this number was picked.
const MAX_SCENE_LUMA = 160;

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
  const usedByCpid = new Map(); // cpid -> Set(style ids already spent), so a blank cycles its people before repeating
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
      // --- MODEL: gather every human FRONT style this blank offers ---
      let cands = [];
      for (const g of groups) if (g.placement === 'front') for (const s of (g.mockup_styles || [])) {
        if (s.view_name !== 'Front' || !HUMAN_STYLE.test(s.category_name || '')) continue;
        if (BANNED_STYLE_IDS.has(s.id)) continue;
        cands.push({ id: s.id, cat: s.category_name, scene: SCENE_STYLE.test(s.category_name), distant: DISTANT_STYLE_IDS.has(s.id) });
      }
      cands.sort((a, b) => a.id - b.id);
      if (!cands.length) for (const g of groups) if (g.placement === 'front') for (const s of (g.mockup_styles || [])) if (s.view_name === 'Front' && s.category_name === 'Flat Lifestyle') cands.push({ id: s.id, cat: 'Flat Lifestyle', scene: true });
      if (!cands.length) { results.push({ pid, name: prod.name, cpid: best.cpid, status: 'no-onmodel-style' }); continue; }

      // --- ATTEMPT ORDER ---
      // Hard requirement: consecutive products must not reuse a person. So the
      // styles already spent on this blank go to the BACK of the queue and only
      // come back once the pool is exhausted — a plain modular rotation doesn't
      // do that, because the first candidate always succeeds and wins every time.
      //
      // Within the unused tier, room shots come before studio cutouts. Cutouts
      // are no longer thrown away: dark-studio-bg re-backs them in the brand tone
      // (see below), which is what makes the value tees' seven extra models
      // usable at all.
      let used = usedByCpid.get(best.cpid) || new Set();
      // Pool exhausted? Start a fresh cycle. Without this the "already used" tier
      // ranks every candidate equally, the first one wins every time, and a long
      // line sharing a blank (the 22 value tees) collapses back onto one person.
      if (cands.every((c) => used.has(c.id))) used = new Set();
      usedByCpid.set(best.cpid, used);
      const rank = (c) => (used.has(c.id) ? 4 : 0) + (c.distant ? 2 : 0) + (c.scene ? 0 : 1);
      const rot = (arr) => arr.map((_, i) => arr[(gidx + i) % arr.length]);
      const attempts = [0, 1, 2, 3, 4, 5, 6, 7].flatMap((r) => rot(cands.filter((c) => rank(c) === r)));
      gidx++;

      let saved = null, lastFail = null, rejected = [];
      for (const pick of attempts) {
        // PNG, not JPG: the studio-cutout styles come back with a real alpha
        // channel, which is what lets them be re-backed cleanly (see below).
        // In-scene styles are simply fully opaque.
        const body = { format: 'png', products: [{ source: 'catalog', mockup_style_ids: [pick.id], catalog_product_id: best.cpid, catalog_variant_ids: [best.variant_id], placements: [{ placement: 'front', technique: 'dtg', layers: [{ type: 'file', url: best.design }] }] }] };
        const task = await pf('/v2/mockup-tasks', { method: 'POST', body: JSON.stringify(body) });
        const tid = task.data && task.data[0] && task.data[0].id;
        if (!tid) { lastFail = 'task-create-fail ' + JSON.stringify(task).slice(0, 160); continue; }
        let url = null;
        for (let i = 0; i < 15; i++) {
          await sleep(4000);
          const r = await pf('/v2/mockup-tasks?id=' + tid);
          const t = r.data && r.data[0]; if (!t) continue;
          if (t.status === 'completed') { const mk = (t.catalog_variant_mockups || [])[0]; const fr = mk && (mk.mockups || []).find((x) => x.placement === 'front'); url = fr && fr.mockup_url; break; }
          if (t.status === 'failed') { lastFail = JSON.stringify(t.failure_reasons); break; }
        }
        if (!url) continue;

        // Write to temp paths so a rejected result never overwrites a good file.
        const out = 'mockups/' + pid + '-model.jpg';
        const raw = path.join(ROOT, 'mockups', '.' + pid + '-candidate.png');
        const tmp = path.join(ROOT, 'mockups', '.' + pid + '-candidate.jpg');
        fs.writeFileSync(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));

        // A studio cutout is no longer a dead end. If the frame carries alpha,
        // re-back it in the brand's dark tone so it sits in the grid alongside
        // the room shots; that's what makes the value tees' extra models usable.
        // An opaque frame is a real photograph and ships as-is — unless it was
        // shot on a white seamless, which nothing here can fix, so we move on.
        let backdrop = 'scene', chk = null;
        const cover = alphaCover(raw);
        if (cover >= MIN_ALPHA_COVER) {
          darkenStudioBg(raw, tmp);
          backdrop = 'darkened';
        } else {
          execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-q:v', '3', tmp]);
          // An opaque frame is a real photograph, but a room shot against a
          // white wall still burns a bright hole in the dark grid — the hoodie
          // and crewneck lifestyle sets are mostly lit like that. Nothing can be
          // composited here (no alpha), so reject and let the loop fall through
          // to a cutout style, which re-backs dark. Measured spread across the
          // catalog: composited tiles sit at ~19, comfortable scenes at 87-144,
          // the offenders at 168-194 — so the line goes between.
          chk = isStudioWhite(tmp);
          const lumas = cornerLuma(tmp);
          const avg = lumas.length ? lumas.reduce((a, b) => a + b, 0) / lumas.length : 0;
          if ((chk && chk.white) || avg > MAX_SCENE_LUMA) {
            const why = chk && chk.white ? 'white seamless' : 'bright room avg=' + Math.round(avg);
            rejected.push(pick.cat + '(' + pick.id + ') ' + why + ' corners=' + lumas.map(Math.round).join(','));
            console.log('   reject', pid, pick.cat, why + ', no alpha to composite');
            fs.unlinkSync(raw); fs.unlinkSync(tmp);
            await sleep(2000);
            continue;
          }
        }
        fs.unlinkSync(raw);
        fs.renameSync(tmp, path.join(ROOT, out));
        used.add(pick.id);
        saved = { pid, name: prod.name, style: pick.cat, styleId: pick.id, backdrop, variant: best.name, file: out, bytes: fs.statSync(path.join(ROOT, out)).size, corners: chk && chk.corners, rejected, status: 'ok' };
        console.log('OK', pid, '|', prod.name, '|', pick.cat, '#' + pick.id, '|', backdrop, '|', best.name, '->', out, saved.bytes + 'b', rejected.length ? '(after ' + rejected.length + ' reject(s))' : '');
        break;
      }
      if (!saved) { results.push({ pid, name: prod.name, status: 'all-white-or-fail', rejected, fail: lastFail }); console.log('MISS', pid, '| no non-white style available'); continue; }
      results.push(saved);
    } catch (e) { results.push({ pid, status: 'exception', err: String(e).slice(0, 200) }); console.log('EXC', pid, e.message); }
    await sleep(2500); // be gentle with Printful's mockup rate limit
  }
  try { fs.writeFileSync(path.join(ROOT, 'scratch-onmodel-results.json'), JSON.stringify(results, null, 2)); } catch (e) {}
  console.log('\n=== SUMMARY ===');
  results.forEach((r) => console.log(String(r.status).padEnd(18), String(r.pid).padEnd(4), '|', String(r.style || '').padEnd(20), String(r.styleId || '').padEnd(6), String(r.backdrop || '').padEnd(9), '|', r.name || '', r.file ? '-> ' + r.file : (r.fail || r.err || '')));
  const people = {};
  results.filter((r) => r.styleId).forEach((r) => { people[r.styleId] = (people[r.styleId] || 0) + 1; });
  console.log('\ndistinct models used:', Object.keys(people).length, '|', JSON.stringify(people));
})();
