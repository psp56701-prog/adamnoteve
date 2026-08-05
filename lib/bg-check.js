// Shared background-brightness check for product mockups.
//
// The shop grid is dark (borderless 3:4 tiles), so a mockup shot on a white
// seamless punches a bright rectangle into the grid and flashes white when the
// same frame is cut into a video ad. Printful's "Women's"/"Men's"/"On model"
// style categories return studio cutouts on white; the "* Lifestyle" categories
// return the environmental shots we actually want. This detects which one we got
// so the generator can retry instead of shipping a cutout.
//
// Method: sample the four corners (background, essentially always) and read
// average luma via ffmpeg's signalstats.
const { execFileSync } = require('child_process');

const BRIGHT = 200;   // luma 0-255 above which a corner reads as studio white
const PROBE = 96;     // corner sample box, px

function cornerLuma(file) {
  const [w, h] = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0:s=x', file,
  ]).toString().trim().split('x').map(Number);

  const p = Math.min(PROBE, Math.floor(Math.min(w, h) / 6));
  const spots = [[0, 0], [w - p, 0], [0, h - p], [w - p, h - p]];

  return spots.map(([x, y]) => {
    // metadata=print writes to the log (stderr) by default, where -v error
    // swallows it; file=- redirects the readings to stdout so we can parse them.
    const log = execFileSync('ffmpeg', [
      '-v', 'error', '-i', file,
      '-vf', `crop=${p}:${p}:${x}:${y},signalstats,metadata=print:file=-`,
      '-frames:v', '1', '-f', 'null', '-',
    ], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    return Number((log.match(/lavfi\.signalstats\.YAVG=([\d.]+)/) || [])[1]);
  }).filter((n) => !Number.isNaN(n));
}

// True when >=3 of 4 corners are bright — i.e. a seamless studio backdrop
// rather than a room. One bright corner is normal (a window, a lamp).
function isStudioWhite(file) {
  const vals = cornerLuma(file);
  if (vals.length < 3) return false; // couldn't read it; don't reject on a guess
  const bright = vals.filter((v) => v >= BRIGHT).length;
  return { white: bright >= 3, corners: vals.map((v) => Math.round(v)), bright };
}

module.exports = { cornerLuma, isStudioWhite, BRIGHT };
