// Netlify Function: track  (Functions API v2)
//
// First-party pageview counter. The store ran from June to August with no
// analytics of any kind, which meant "is traffic dead?" was unanswerable —
// there was no way to tell "nobody arrives" (a marketing problem) apart from
// "people arrive and leave" (a store problem). This closes that gap.
//
// Deliberately minimal and privacy-clean: no cookies, no IP storage, no device
// fingerprint, nothing that identifies a person. It keeps per-day counters of
// pageviews, which pages got them, and which host referred them — enough to
// answer "did Pinterest send anyone today", which is the actual question.
//
// This is a v2 (ESM, export default) function on purpose: @netlify/blobs only
// gets its store credentials injected automatically on the v2 runtime. As a v1
// `exports.handler` it fails with MissingBlobsEnvironmentError.
import { getStore } from '@netlify/blobs';

// Bots are the majority of hits on a small unknown site. Counting them would
// invent traffic that doesn't exist, which is worse than having no analytics.
const BOT = /bot|crawl|spider|slurp|bingpreview|headless|phantom|puppeteer|playwright|lighthouse|curl|wget|python-requests|axios|go-http|java\/|okhttp|scrapy|semrush|ahrefs|mj12|dotbot|petalbot|dataprovider|facebookexternalhit|preview|monitor|uptime|pingdom|gtmetrix/i;

// Referrer reduced to a bare host, and only when it's off-site. Internal
// navigation isn't a traffic source and would drown out the real ones.
function sourceOf(referrer) {
  if (!referrer) return 'direct';
  let host;
  try { host = new URL(referrer).hostname.replace(/^www\./, ''); } catch { return 'direct'; }
  if (!host || host === 'adamnoteve.com') return null; // internal
  return host;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  const ua = req.headers.get('user-agent') || '';
  // Silent 204 for bots — a 4xx would just show up as errors in the logs.
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });

  let body = {};
  try { body = await req.json(); } catch { /* keep defaults */ }

  const path = String(body.path || '/').slice(0, 120);
  const source = sourceOf(body.referrer);
  const day = new Date().toISOString().slice(0, 10);

  try {
    // Append-only, one blob per view, never read-modify-write. Blobs has no
    // atomic increment, so incrementing a shared daily record means two
    // simultaneous visitors read the same counts and clobber each other —
    // silently undercounting exactly when traffic finally picks up. A unique
    // key per event can't collide; stats.js sums them at read time.
    const store = getStore('pageviews');
    const key = `${day}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await store.setJSON(key, { path, source });
  } catch (err) {
    // Analytics must never break the page, so this still resolves successfully.
    // But a silently swallowed write is how you end up believing you have no
    // traffic when you actually have no *logging* — the exact failure this
    // whole feature exists to prevent. Pass ?debug=<STATS_TOKEN> to see why.
    const debug = new URL(req.url).searchParams.get('debug');
    if (process.env.STATS_TOKEN && debug === process.env.STATS_TOKEN) {
      return Response.json({ ok: false, error: String(err && err.message || err) }, { status: 200 });
    }
    return Response.json({ ok: false }, { status: 200 });
  }
  return Response.json({ ok: true }, { status: 200 });
};

export const config = { path: '/.netlify/functions/track' };
