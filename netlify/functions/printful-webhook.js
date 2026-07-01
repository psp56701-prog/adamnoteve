// Netlify Function: printful-webhook
//
// Receives Printful webhook events (configured to send "package_shipped") and
// emails the customer a branded "your order shipped" notification with tracking.
//
// Security: Printful's v1 webhooks aren't signed, so we gate on a shared secret
// passed in the URL (?token=...) that must match PRINTFUL_WEBHOOK_TOKEN. The
// webhook is registered with that token in the URL.
//
// Always returns 200 once the token is valid so Printful doesn't retry forever;
// failures are logged for manual follow-up.

const { Resend } = require('resend');
const { shippingNotificationHTML } = require('../../lib/email-templates');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  // Shared-secret gate.
  const expected = process.env.PRINTFUL_WEBHOOK_TOKEN;
  const token = (event.queryStringParameters && event.queryStringParameters.token) || '';
  if (expected && token !== expected) {
    console.warn('[printful-webhook] bad/missing token');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // We only act on shipments. Acknowledge everything else with 200.
  if (payload.type !== 'package_shipped') {
    console.log('[printful-webhook] ignored event:', payload.type);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  try {
    await sendShippedEmail(payload.data || {});
  } catch (err) {
    console.error('[printful-webhook] handler error:', err.message);
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function sendShippedEmail(data) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[printful-webhook] RESEND_API_KEY not set; skipping.');
    return;
  }
  const shipment = data.shipment || {};
  const order = data.order || {};
  const recipient = order.recipient || {};
  const to = recipient.email;
  if (!to) {
    console.warn('[printful-webhook] no recipient email on order', order.id);
    return;
  }

  const orderNumber = order.external_id || ('PF-' + (order.id || ''));
  const items = (order.items || []).map((it) => ({
    name: it.name || 'Item',
    variant: null,
    qty: it.quantity || 1,
  }));

  const shippingAddress = {
    name: recipient.name,
    line1: recipient.address1,
    line2: recipient.address2,
    city: recipient.city,
    state: recipient.state_code,
    postal_code: recipient.zip,
    country: recipient.country_code,
  };

  const supportEmail = process.env.EMAIL_SUPPORT || process.env.EMAIL_FROM || 'support@adamnoteve.com';
  const brandUrl = process.env.SITE_URL || 'https://adamnoteve.com';

  const { html, text } = shippingNotificationHTML({
    orderNumber,
    customerName: recipient.name,
    items,
    trackingNumber: shipment.tracking_number,
    trackingUrl: shipment.tracking_url,
    carrier: shipment.carrier,
    shippingAddress,
    supportEmail,
    brandUrl,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'Adamnoteve <orders@adamnoteve.com>';
  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: `🍎 Your Adamnoteve order #${orderNumber} has shipped`,
      html,
      text,
      reply_to: supportEmail,
    });
    console.log('[printful-webhook] shipped email sent', { to, order: orderNumber, id: result?.data?.id });
  } catch (err) {
    console.error('[printful-webhook] email failed', { to, order: orderNumber, error: err.message });
  }
}
