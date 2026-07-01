// Minimal Printful API client.
//
// Docs: https://developers.printful.com/docs/v2-beta/
// We use the v1 Orders endpoint here because it's stable and covers everything
// we need for direct order submission.

const PRINTFUL_API = 'https://api.printful.com';

async function createPrintfulOrder({ apiKey, recipient, items, externalId, confirm = false }) {
  if (!apiKey) throw new Error('PRINTFUL_API_KEY missing.');
  if (!recipient || !items || items.length === 0) {
    throw new Error('Printful order requires a recipient and at least one item.');
  }

  const url = `${PRINTFUL_API}/orders${confirm ? '?confirm=1' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: externalId,
      recipient,
      items,
    }),
  });

  let payload;
  try { payload = await res.json(); } catch (e) { payload = null; }

  if (!res.ok) {
    const detail = payload?.error?.message || payload?.result || res.statusText;
    const err = new Error(`Printful API ${res.status}: ${detail}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload.result;
}

module.exports = { createPrintfulOrder };
