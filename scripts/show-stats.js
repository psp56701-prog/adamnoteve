// Print the store's traffic from the first-party counter.
//
//   node scripts/show-stats.js [days]      (default 30)
//
// Reads STATS_TOKEN from Netlify's production env so there's no second copy of
// the secret lying around in .env.
const { execFileSync } = require('child_process');

const days = Number(process.argv[2]) || 30;

function productionToken() {
  const out = execFileSync('npx', ['netlify', 'env:get', 'STATS_TOKEN', '--context', 'production'], {
    encoding: 'utf8', shell: process.platform === 'win32',
  });
  const m = out.match(/\b([a-f0-9]{24,})\b/i);
  if (!m) throw new Error('STATS_TOKEN not set in Netlify production env');
  return m[1];
}

const bar = (n, max) => '█'.repeat(max ? Math.round((n / max) * 40) : 0);

(async () => {
  const token = productionToken();
  const r = await fetch(`https://adamnoteve.com/.netlify/functions/stats?days=${days}&token=${token}`);
  if (!r.ok) { console.error('stats endpoint returned', r.status, await r.text()); process.exit(1); }
  const d = await r.json();

  console.log(`\n=== adamnoteve traffic — last ${d.windowDays} days ===`);
  console.log(`TOTAL PAGEVIEWS: ${d.totalViews}\n`);

  const max = Math.max(...d.byDay.map((x) => x.views), 1);
  d.byDay.forEach((x) => console.log(`  ${x.day}  ${String(x.views).padStart(5)}  ${bar(x.views, max)}`));

  console.log('\n--- top pages ---');
  if (!d.topPages.length) console.log('  (none yet)');
  d.topPages.forEach(([p, n]) => console.log(`  ${String(n).padStart(5)}  ${p}`));

  console.log('\n--- traffic sources ---');
  if (!d.topSources.length) console.log('  (none yet — no off-site referrals recorded)');
  d.topSources.forEach(([s, n]) => console.log(`  ${String(n).padStart(5)}  ${s}`));
  console.log('');
})();
