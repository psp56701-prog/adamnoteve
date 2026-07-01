// Netlify Function: stripe-webhook
//
// Receives webhook events from Stripe (e.g. checkout.session.completed) and
// performs server-side fulfillment:
//   1. Verify the Stripe signature
//   2. List line items
//   3. Send a branded confirmation email via Resend (best-effort)
//   4. Submit the order to Printful (best-effort)
//
// IMPORTANT: this function MUST always return 200 once the signature is valid,
// even if email/Printful fail. Otherwise Stripe retries indefinitely. Errors
// are logged so you can fix them by hand.

const Stripe = require('stripe');
const { Resend } = require('resend');
const { createPrintfulOrder } = require('../../lib/printful');
const { getPrintfulVariant, normalizeCountryCode } = require('../../lib/printful-mapping');
const { orderConfirmationHTML } = require('../../lib/email-templates');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !apiKey) {
    console.error('Webhook env vars missing.');
    return { statusCode: 500, body: 'Server not configured.' };
  }

  const stripe = new Stripe(apiKey);
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];

  // Stripe verification needs the raw body bytes.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      try {
        await handleCheckoutCompleted(stripe, stripeEvent.data.object);
      } catch (err) {
        console.error('[fulfillment:exception]', err.message);
      }
      break;
    case 'checkout.session.expired':
      console.log('[checkout:expired]', stripeEvent.data.object.id);
      break;
    default:
      console.log('[stripe:unhandled]', stripeEvent.type);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function handleCheckoutCompleted(stripe, session) {
  console.log('[order:paid]', {
    sessionId: session.id,
    amount: session.amount_total,
    currency: session.currency,
    email: session.customer_details?.email,
    name: session.customer_details?.name,
  });

  // Always pull line items + product metadata — both email and Printful need them.
  let lineItemsResp;
  try {
    lineItemsResp = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
      limit: 100,
    });
  } catch (err) {
    console.error('[stripe:list-line-items]', err.message);
    return; // can't fulfill without line items, give up gracefully
  }

  // Run email and Printful independently — failure of one shouldn't block the other.
  await Promise.allSettled([
    sendOrderEmail(session, lineItemsResp.data),
    submitToPrintful(session, lineItemsResp.data),
  ]);
}

// ============================================================
// EMAIL (Resend)
// ============================================================
async function sendOrderEmail(session, lineItems) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email:skip] RESEND_API_KEY not set.');
    return;
  }
  const recipientEmail = session.customer_details?.email;
  if (!recipientEmail) {
    console.warn('[email:skip] no customer email on session.');
    return;
  }

  const items = lineItems.map((li) => {
    const meta = li.price?.product?.metadata || {};
    const variantParts = [];
    if (meta.size) variantParts.push(meta.size);
    if (meta.color) variantParts.push(meta.color);
    return {
      name: li.price?.product?.name || li.description || 'Item',
      variant: variantParts.join(' · ') || null,
      qty: li.quantity,
      amount: li.amount_total ?? (li.price?.unit_amount || 0) * li.quantity,
    };
  });

  // Stripe gives totals in cents. discount = subtotal - subtotal_excluding_discount? No —
  // total_details has it directly:
  const td = session.total_details || {};
  const discount = td.amount_discount || 0;
  const tax = td.amount_tax || 0;
  const shipping = td.amount_shipping || 0;
  const subtotal = (session.amount_subtotal != null)
    ? session.amount_subtotal
    : items.reduce((s, it) => s + it.amount, 0);
  const total = session.amount_total || 0;

  const orderNumber = 'AE-' + session.id.slice(-10).toUpperCase();

  const ship = session.shipping_details || {};
  const shipAddr = ship.address || {};
  const shippingAddress = {
    name: ship.name || session.customer_details?.name,
    line1: shipAddr.line1,
    line2: shipAddr.line2,
    city: shipAddr.city,
    state: shipAddr.state,
    postal_code: shipAddr.postal_code,
    country: shipAddr.country,
  };

  const supportEmail = process.env.EMAIL_SUPPORT || process.env.EMAIL_FROM || 'support@example.com';
  const brandUrl = process.env.SITE_URL || 'https://adamnoteve.com';

  const { html, text } = orderConfirmationHTML({
    orderNumber,
    customerName: session.customer_details?.name || ship.name,
    items,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    currency: session.currency || 'usd',
    shippingAddress,
    supportEmail,
    brandUrl,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'Adamnoteve <orders@adamnoteve.com>';

  try {
    const result = await resend.emails.send({
      from,
      to: recipientEmail,
      subject: `Your Adamnoteve order #${orderNumber}`,
      html,
      text,
      reply_to: supportEmail,
    });
    console.log('[email:sent]', { to: recipientEmail, id: result?.data?.id });
  } catch (err) {
    console.error('[email:failed]', {
      to: recipientEmail,
      error: err.message,
    });
  }
}

// ============================================================
// PRINTFUL FULFILLMENT
// ============================================================
async function submitToPrintful(session, lineItems) {
  if (!process.env.PRINTFUL_API_KEY) {
    console.warn('[printful:skip] PRINTFUL_API_KEY not set.');
    return;
  }

  const printfulItems = [];
  const unmapped = [];
  for (const li of lineItems) {
    const meta = li.price?.product?.metadata || {};
    const variant = getPrintfulVariant({
      productId: meta.product_id,
      size: meta.size,
      color: meta.color,
    });
    if (!variant) {
      unmapped.push({
        productId: meta.product_id,
        size: meta.size,
        color: meta.color,
        qty: li.quantity,
      });
      continue;
    }
    const item = { quantity: li.quantity };
    if (variant.sync_variant_id) {
      item.sync_variant_id = variant.sync_variant_id;
    } else {
      item.variant_id = variant.variant_id;
      item.files = variant.files;
    }
    printfulItems.push(item);
  }

  if (unmapped.length > 0) {
    console.error('[printful:no-mapping]', {
      sessionId: session.id,
      missing: unmapped,
      hint: 'Add entries to lib/printful-mapping.js for these (productId, size, color) keys.',
    });
  }

  if (printfulItems.length === 0) {
    console.error('[printful:nothing-to-ship]', session.id);
    return;
  }

  const ship = session.shipping_details || {};
  const addr = ship.address || {};
  const recipient = {
    name: ship.name || session.customer_details?.name || 'Customer',
    email: session.customer_details?.email || undefined,
    phone: session.customer_details?.phone || undefined,
    address1: addr.line1 || '',
    address2: addr.line2 || '',
    city: addr.city || '',
    state_code: addr.state || '',
    country_code: normalizeCountryCode(addr.country) || 'US',
    zip: addr.postal_code || '',
  };

  const confirm = process.env.PRINTFUL_AUTO_CONFIRM === 'true';

  try {
    const result = await createPrintfulOrder({
      apiKey: process.env.PRINTFUL_API_KEY,
      recipient,
      items: printfulItems,
      // Printful's external_id has a length cap; the full Stripe session id (cs_live_…, ~66 chars)
      // is rejected as "Invalid External ID specified". Use the short AE- order number the
      // customer also sees in their confirmation email — unique and well under the limit.
      externalId: 'AE-' + session.id.slice(-10).toUpperCase(),
      confirm,
    });
    console.log('[printful:order-created]', {
      printfulOrderId: result.id,
      status: result.status,
      confirm,
      stripeSessionId: session.id,
    });
  } catch (err) {
    console.error('[printful:create-failed]', {
      sessionId: session.id,
      error: err.message,
      payload: err.payload || null,
      recipient,
      itemCount: printfulItems.length,
    });
  }
}
