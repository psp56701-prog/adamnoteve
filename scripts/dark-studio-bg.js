// Re-back Printful's studio cutout mockups in the brand's dark tone.
//
// Why this exists: Printful only ships TWO in-scene ("* Lifestyle") mockup
// styles for the Gildan 64000 value tee — and one of them is a model in a
// puffer vest that covers the print. That left the whole value line wearing the
// same shot. The other seven styles are studio cutouts, which used to be
// rejected outright because a white tile punches a bright rectangle into the
// dark shop grid. Re-backing them lets all seven into the rotation, so the grid
// finally shows different people.
//
// The cutouts come back from the mockup API as PNG with a real alpha channel
// (~68% transparent; scene styles come back fully opaque, which is how the
// generator tells the two apart). That means no keying and no flood fill: the
// gaps between arm and torso are already transparent, and white type on the
// shirt is opaque and simply never at risk.
//
// Alpha is straight, not premultiplied — verified against edge pixels — so the
// composite is the plain over operator. Pixels move through ffmpeg, already a
// dependency of bg-check.js, so this needs no image library.
const { execFileSync } = require('child_process');

const MIN_ALPHA_COVER = 0.05; // below this there's no cutout to composite

// Brand dark tones (see :root in styles.css) — --bg #140820, --surface #241035.
const EDGE = [0x14, 0x08, 0x20];
const CENTER = [0x2e, 0x16, 0x44];

function dims(file) {
  return execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file,
  ]).toString().trim().split('x').map(Number);
}

const decodeRGBA = (file) => execFileSync('ffmpeg', [
  '-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-',
], { maxBuffer: 1 << 30 });

// Fraction of the frame that is fully transparent. A studio cutout runs ~0.5-0.7;
// an in-scene photograph is a flat 0.
function alphaCover(file) {
  const buf = decodeRGBA(file);
  let clear = 0;
  for (let i = 3; i < buf.length; i += 4) if (buf[i] < 10) clear++;
  return clear / (buf.length / 4);
}

// Soft radial pool of light, centred a little above the middle — where a studio
// key light would actually fall behind a standing model.
function backdrop(w, h) {
  const px = new Uint8Array(w * h * 3);
  const cx = w / 2, cy = h * 0.38;
  const max = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = Math.min(1, Math.hypot(x - cx, y - cy) / max) ** 1.35;
      const i = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(CENTER[c] + (EDGE[c] - CENTER[c]) * t);
    }
  }
  return px;
}

// Composite an RGBA cutout over the dark backdrop and write a JPG.
function darkenStudioBg(src, dest) {
  const [w, h] = dims(src);
  const rgba = decodeRGBA(src);
  let clear = 0;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 10) clear++;
  const cover = clear / (w * h);
  if (cover < MIN_ALPHA_COVER) return { ok: false, cover };

  const bg = backdrop(w, h);
  const out = Buffer.allocUnsafe(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3] / 255, s = i * 4, d = i * 3;
    for (let c = 0; c < 3; c++) out[d + c] = Math.round(rgba[s + c] * a + bg[d + c] * (1 - a));
  }
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-i', '-',
    '-q:v', '3', dest,
  ], { input: out, maxBuffer: 1 << 30 });
  return { ok: true, cover };
}

module.exports = { darkenStudioBg, alphaCover, MIN_ALPHA_COVER };

if (require.main === module) {
  const [src, dest] = process.argv.slice(2);
  if (!src || !dest) { console.error('usage: node dark-studio-bg.js <src.png> <dest.jpg>'); process.exit(1); }
  const r = darkenStudioBg(src, dest);
  console.log(r.ok ? `ok ${dest} (cutout ${(r.cover * 100).toFixed(1)}%)`
                   : `skip ${src} — only ${(r.cover * 100).toFixed(1)}% transparent, not a cutout`);
}
