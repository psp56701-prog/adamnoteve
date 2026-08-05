// Netlify Function: stats  (Functions API v2)
//
// Read side of the first-party counter written by track.js. Returns the last N
// days of pageviews, top pages and referring hosts as JSON.
//
// Gated behind STATS_TOKEN so competitors (and idle browsers) can't read the
// store's traffic. Without the env var set the endpoint stays closed rather
// than defaulting open.
//
// v2 (ESM) for the same reason as track.js — @netlify/blobs needs that runtime
// to pick up its store credentials.
import { getStore } from '@netlify/blobs';

const json = (status, body) => new Response(JSON.stringify(body, null, 2), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const topN = (obj, n) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n);

export default async (req) => {
  const url = new URL(req.url);
  const token = process.env.STATS_TOKEN;
  if (!token || url.searchParams.get('token') !== token) return json(401, { error: 'unauthorized' });

  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 30));
  const store = getStore('pageviews');

  // track.js writes one blob per view under `<day>/<ts>-<rand>`, so a day's
  // total is just how many keys carry that prefix. Reads are fanned out in
  // batches — sequential gets would crawl once a day has real volume.
  const byDay = [];
  const totalPages = {}, totalSources = {};
  let total = 0;
  for (let i = 0; i < days; i++) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const { blobs } = await store.list({ prefix: `${day}/` });
    byDay.push({ day, views: blobs.length });
    total += blobs.length;
    for (let j = 0; j < blobs.length; j += 50) {
      const batch = await Promise.all(
        blobs.slice(j, j + 50).map((b) => store.get(b.key, { type: 'json' }).catch(() => null)),
      );
      for (const rec of batch) {
        if (!rec) continue;
        if (rec.path) totalPages[rec.path] = (totalPages[rec.path] || 0) + 1;
        if (rec.source) totalSources[rec.source] = (totalSources[rec.source] || 0) + 1;
      }
    }
  }

  return json(200, {
    windowDays: days,
    totalViews: total,
    byDay: byDay.reverse(),
    topPages: topN(totalPages, 15),
    topSources: topN(totalSources, 15),
  });
};

export const config = { path: '/.netlify/functions/stats' };
