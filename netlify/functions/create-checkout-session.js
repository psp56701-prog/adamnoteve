// Netlify Function: create-checkout-session
//
// Receives the cart from the browser, validates it against the server-side
// PRODUCT catalog (so the client can't tamper with prices), then creates a
// Stripe Checkout Session and returns its hosted URL.

const Stripe = require('stripe');
const { PRODUCTS, getVariantPrice, isProductLive } = require('../../lib/products');
const { getPrintfulVariant } = require('../../lib/printful-mapping');

// Promo codes that the server will honor. Each must also exist as a Coupon
// in the Stripe Dashboard with a matching ID — Stripe is the actual authority
// on the discount math; this map just gates which codes we'll attach.
const SERVER_PROMOS = {
  HEARTBROKEN: { stripeCouponId: process.env.STRIPE_COUPON_HEARTBROKEN || null },
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(500, { error: 'STRIPE_SECRET_KEY is not configured on the server.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  const { items = [], email, promo, shipping, heardFrom } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    return json(400, { error: 'Cart is empty.' });
  }

  // Stripe Tax: gated on env var. Once enabled, Stripe calculates tax based on
  // the customer's shipping address. Requires:
  //   1. Stripe Tax enabled in Dashboard → Tax → Settings
  //   2. Your business registered for sales tax in your home state(s)
  //   3. tax_code on each line item (we use the general merchandise default)
  const taxEnabled = process.env.STRIPE_TAX_ENABLED === 'true';

  // Build line_items from server-side catalog (NEVER trust client prices).
  const lineItems = [];
  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.id);
    if (!product) {
      return json(400, { error: `Unknown product: ${item.id}` });
    }
    if (!isProductLive(product)) {
      return json(400, { error: `"${product.name}" is coming soon and cannot be purchased yet.` });
    }
    // Reject size/color combos with no Printful mapping (e.g. a 20oz mug in a
    // color whose blank only comes in 11oz) so unfulfillable orders can't be placed.
    if (!getPrintfulVariant({ productId: item.id, size: item.size, color: item.color })) {
      const combo = [item.size, item.color].filter(Boolean).join(' / ');
      return json(400, { error: `"${product.name}" isn't available in ${combo || 'that option'}.` });
    }
    const qty = Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1));

    const variantParts = [];
    if (item.size) variantParts.push(String(item.size).slice(0, 40));
    if (item.color) variantParts.push(String(item.color).slice(0, 40));
    const description = variantParts.length ? variantParts.join(' · ') : undefined;

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(getVariantPrice(product, item.size) * 100), // cents
        // tax_behavior is required when automatic_tax is enabled.
        ...(taxEnabled ? { tax_behavior: 'exclusive' } : {}),
        product_data: {
          name: product.name,
          description,
          images: product.img ? [product.img] : undefined,
          // tax_code: 'txcd_99999999' is Stripe's "General — Tangible Goods"
          // catch-all. For per-category accuracy (e.g. clothing exempt in some
          // US states), refine by setting product.tax_code in lib/products.js
          // and reading it here.
          ...(taxEnabled ? { tax_code: 'txcd_99999999' } : {}),
          metadata: {
            product_id: product.id,
            size: item.size || '',
            color: item.color || '',
          },
        },
      },
    });
  }

  // Optional discount — only attach if the code is in our allowlist AND
  // a corresponding Stripe coupon ID is configured.
  const discounts = [];
  if (promo && typeof promo === 'string') {
    const code = promo.trim().toUpperCase();
    const entry = SERVER_PROMOS[code];
    if (entry && entry.stripeCouponId) {
      discounts.push({ coupon: entry.stripeCouponId });
    }
  }

  const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '') || 'http://localhost:8888';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Shipping: flat $4.99 under $50, free at $50+. Decide which single option to
  // offer based on the server-computed subtotal so the "over $50" rule is actually
  // enforced (previously BOTH options were always shown, letting anyone pick free).
  const subtotalCents = lineItems.reduce(
    (sum, li) => sum + li.price_data.unit_amount * li.quantity,
    0
  );
  const FREE_SHIP_THRESHOLD_CENTS = 5000; // $50
  const shipRate = (amountCents, name, minDay, maxDay) => ({
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: { amount: amountCents, currency: 'usd' },
      display_name: name,
      delivery_estimate: {
        minimum: { unit: 'business_day', value: minDay },
        maximum: { unit: 'business_day', value: maxDay },
      },
      // tax_code 'txcd_92010001' = "Shipping" (taxable in most US states).
      ...(taxEnabled ? { tax_behavior: 'exclusive', tax_code: 'txcd_92010001' } : {}),
    },
  });
  const shippingOptions =
    subtotalCents >= FREE_SHIP_THRESHOLD_CENTS
      ? [shipRate(0, 'Free shipping (orders over $50)', 5, 10)]
      : [shipRate(499, 'Standard shipping', 3, 7)];

  // Petty Perk: a FREE Bitten Heart Sticker on orders over $40. Added as a $0
  // line item so (a) the customer sees the gift on the Stripe page + email, and
  // (b) the webhook fulfills it automatically — its product_id metadata resolves
  // to p37's Printful sync variant exactly like any paid item. Computed from the
  // paid subtotal (this line is $0 so it doesn't move the threshold or shipping).
  const FREE_STICKER_THRESHOLD_CENTS = 4000; // $40
  if (subtotalCents >= FREE_STICKER_THRESHOLD_CENTS) {
    const sticker = PRODUCTS.find((p) => p.id === 'p37');
    if (sticker && isProductLive(sticker) && getPrintfulVariant({ productId: 'p37' })) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 0,
          ...(taxEnabled ? { tax_behavior: 'exclusive' } : {}),
          product_data: {
            name: '🎁 Free Bitten Heart Sticker',
            description: 'Our gift to you — orders over $40',
            images: sticker.img ? [sticker.img] : undefined,
            ...(taxEnabled ? { tax_code: 'txcd_99999999' } : {}),
            metadata: { product_id: 'p37', size: '', color: '', free_gift: 'true' },
          },
        },
      });
    }
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      // If we attached a coupon, omit allow_promotion_codes (Stripe disallows both).
      // Otherwise let customers enter codes on the Stripe page.
      ...(discounts.length > 0 ? { discounts } : { allow_promotion_codes: true }),
      customer_email: email && /^\S+@\S+\.\S+$/.test(email) ? email : undefined,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      // Single enforced option: $4.99 flat under $50, free at $50+ (built above).
      shipping_options: shippingOptions,
      automatic_tax: { enabled: taxEnabled },
      metadata: {
        source: 'adamnoteve-web',
        shipping_first_name: shipping?.firstName?.slice(0, 80) || '',
        shipping_last_name: shipping?.lastName?.slice(0, 80) || '',
        heard_from: (heardFrom || '').toString().slice(0, 80),
      },
      success_url: `${siteUrl}/checkout.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout.html?status=canceled`,
    });
  } catch (err) {
    console.error('Stripe session error:', err);
    return json(500, { error: 'Could not create checkout session.', detail: err.message });
  }

  return json(200, { url: session.url, id: session.id });
};
