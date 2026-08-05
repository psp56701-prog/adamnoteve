// Audit product mockups for bright/white studio backgrounds.
//
// Why: the shop grid is dark (Tommy-style borderless tiles). A mockup shot on a
// white seamless punches a bright rectangle into the grid, and the same frame
// flashes white when the shot is cut into a video ad. CSS can't fix it — the
// background is baked into the JPG — so the fix is regenerating with a different
// Printful mockup style. This tells us WHICH products need that.
//
// Method: sample the four corners (background, essentially always) with ffmpeg's
// signalstats and read average luma. Flat + bright corners == studio white.
//
//   node scripts/audit-mockup-bg.js            # audit every mockup
//   node scripts/audit-mockup-bg.js p9 p41     # audit specific products
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const MOCKUPS = path.join(ROOT, 'mockups');

// Luma 0-255. Above this a corner reads as "bright studio backdrop" rather than
// the dark/contextual backgrounds the grid wants.
const BRIGHT = 200;
// A corner that is bright but busy (high variance) is probably content, not a
// seamless backdrop, so require the sample to be reasonably flat too.
const FLAT_STDDEV = 18;

const PROBE = 96; // corner sample box, px

function corners(file) {
  const dims = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0:s=x', file,
  ]).toString().trim().split('x').map(Number);
  const [w, h] = dims;
  const p = Math.min(PROBE, Math.floor(Math.min(w, h) / 6));
  const spots = {
    tl: [0, 0],
    tr: [w - p, 0],
    bl: [0, h - p],
    br: [w - p, h - p],
  };
  const out = {};
  for (const [name, [x, y]] of Object.entries(spots)) {
    // metadata=print writes to ffmpeg's log (stderr) by default, where -v error
    // swallows it. file=- redirects the readings to stdout so we can parse them.
    const log = execFileSync('ffmpeg', [
      '-v', 'error', '-i', file,
      '-vf', `crop=${p}:${p}:${x}:${y},signalstats,metadata=print:file=-`,
      '-frames:v', '1', '-f', 'null', '-',
    ], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    const avg = Number((log.match(/lavfi\.signalstats\.YAVG=([\d.]+)/) || [])[1]);
    const std = Number((log.match(/lavfi\.signalstats\.YDIF=([\d.]+)/) || [])[1]);
    out[name] = { avg, std };
  }
  return { w, h, out };
}

const targets = process.argv.slice(2);
const files = fs.readdirSync(MOCKUPS)
  .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
  .filter((f) => !targets.length || targets.some((t) => f === `${t}.png` || f.startsWith(`${t}-`) || f.startsWith(`${t}.`)))
  .sort();

const flagged = [];
for (const f of files) {
  const file = path.join(MOCKUPS, f);
  let r;
  try { r = corners(file); } catch (e) { console.log('ERR '.padEnd(8), f, e.message.slice(0, 80)); continue; }
  const vals = Object.values(r.out).map((c) => c.avg).filter((n) => !Number.isNaN(n));
  if (!vals.length) { console.log('SKIP'.padEnd(8), f); continue; }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const brightCorners = vals.filter((v) => v >= BRIGHT).length;
  const isWhite = brightCorners >= 3;
  if (isWhite) flagged.push({ file: f, mean: Math.round(mean), brightCorners });
  console.log(
    (isWhite ? 'WHITE' : 'ok').padEnd(8),
    f.padEnd(22),
    'corners=' + vals.map((v) => Math.round(v)).join(','),
    'mean=' + Math.round(mean),
  );
}

console.log('\n=== FLAGGED (' + flagged.length + ' of ' + files.length + ') ===');
flagged.forEach((x) => console.log(' ', x.file, '| mean luma', x.mean, '|', x.brightCorners + '/4 corners bright'));
if (flagged.length) {
  const pids = [...new Set(flagged.map((x) => x.file.replace(/[-.].*$/, '')))];
  console.log('\nRegenerate with:\n  node scripts/gen-onmodel-mockups.js ' + pids.join(' '));
}
