// Email templates for transactional emails sent from the webhook.
//
// Email HTML is its own special hell — most clients strip <style> tags,
// don't support flexbox/grid, and have wildly inconsistent rendering. This
// uses a table-based layout with inline styles, which is the boring-but-
// reliable approach.

function escapeHTML(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(cents, currency = 'USD') {
  if (cents == null) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

// Inline-style helpers, kept short.
const PINK = '#ff007a';
const INK = '#120024';
const CREAM = '#fff5ec';
const NEON = '#d4ff00';

function orderConfirmationHTML({
  orderNumber,
  customerName,
  items, // [{ name, variant, qty, amount }] — amount in cents
  subtotal,
  shipping,
  tax,
  discount,
  total,
  currency,
  shippingAddress,
  supportEmail,
  brandUrl,
}) {
  const itemRows = items.map((it) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px dashed rgba(18,0,36,0.15);font-family:Helvetica,Arial,sans-serif;">
        <div style="font-weight:700;font-size:15px;color:${INK};">${escapeHTML(it.name)}</div>
        ${it.variant ? `<div style="font-size:13px;color:#666;margin-top:3px;">${escapeHTML(it.variant)}</div>` : ''}
        <div style="font-size:13px;color:#666;margin-top:3px;">Qty ${it.qty}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px dashed rgba(18,0,36,0.15);text-align:right;font-family:Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;color:${PINK};vertical-align:top;">
        ${formatMoney(it.amount, currency)}
      </td>
    </tr>
  `).join('');

  const totalRow = (label, value, opts = {}) => `
    <tr>
      <td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${opts.muted ? '#666' : INK};${opts.bold ? 'font-weight:700;' : ''}">${escapeHTML(label)}</td>
      <td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${opts.color || INK};text-align:right;${opts.bold ? 'font-weight:700;' : ''}">${escapeHTML(value)}</td>
    </tr>
  `;

  const addr = shippingAddress || {};
  const addrLines = [
    addr.name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order #${escapeHTML(orderNumber)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM};padding:30px 10px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${CREAM};">

        <!-- Header -->
        <tr><td style="padding:0 0 28px 0;text-align:center;">
          <a href="${escapeHTML(brandUrl || '#')}" style="text-decoration:none;color:${INK};font-family:Impact,Helvetica,Arial,sans-serif;font-size:32px;letter-spacing:1px;">
            adamnot<span style="color:${PINK};">♥</span>eve
          </a>
        </td></tr>

        <!-- Hero card -->
        <tr><td>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PINK};border:3px solid ${INK};border-radius:20px;overflow:hidden;">
            <tr><td style="padding:32px 28px;text-align:center;">
              <div style="display:inline-block;width:60px;height:60px;background:${NEON};border:3px solid ${INK};border-radius:50%;line-height:54px;font-size:32px;color:${INK};margin-bottom:14px;">✓</div>
              <h1 style="margin:0 0 8px 0;color:${CREAM};font-family:Impact,Helvetica,Arial,sans-serif;font-size:34px;letter-spacing:1px;">order placed!</h1>
              <p style="margin:0;color:${CREAM};font-size:16px;">${escapeHTML(customerName ? 'thanks, ' + customerName.split(' ')[0] + '. you did the thing.' : 'thanks. you did the thing.')}</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 4px 8px 4px;">
          <div style="display:inline-block;background:${INK};color:${NEON};padding:8px 16px;border-radius:30px;font-family:Impact,Helvetica,Arial,sans-serif;letter-spacing:1px;font-size:13px;">
            ORDER #${escapeHTML(orderNumber)}
          </div>
        </td></tr>

        <!-- Items -->
        <tr><td style="padding:8px 4px 8px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${itemRows}
          </table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:18px 4px 0 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${totalRow('Subtotal', formatMoney(subtotal, currency))}
            ${discount > 0 ? totalRow('Discount', '−' + formatMoney(discount, currency), { color: PINK }) : ''}
            ${totalRow('Shipping', shipping === 0 ? 'FREE' : formatMoney(shipping, currency))}
            ${tax > 0 ? totalRow('Tax', formatMoney(tax, currency), { muted: true }) : ''}
            <tr><td colspan="2" style="padding:6px 0;"><div style="border-top:2px solid ${INK};"></div></td></tr>
            ${totalRow('Total', formatMoney(total, currency), { bold: true, color: PINK })}
          </table>
        </td></tr>

        <!-- Shipping address -->
        ${addrLines.length ? `
        <tr><td style="padding:24px 4px 0 4px;">
          <h3 style="margin:0 0 10px 0;font-family:Impact,Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:1.5px;color:${PINK};">SHIPPING TO</h3>
          <div style="font-size:14px;line-height:1.5;color:${INK};">
            ${addrLines.map(escapeHTML).join('<br>')}
          </div>
        </td></tr>` : ''}

        <!-- Help block -->
        <tr><td style="padding:32px 4px 0 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${NEON};border:3px solid ${INK};border-radius:16px;">
            <tr><td style="padding:20px 22px;">
              <h3 style="margin:0 0 8px 0;font-family:Impact,Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:1.5px;color:${INK};">WHAT HAPPENS NEXT</h3>
              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${INK};">
                We're getting your order ready. You'll get a tracking email once it ships — usually within 3–7 business days.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:${INK};">
                Questions? Email <a href="mailto:${escapeHTML(supportEmail)}" style="color:${PINK};font-weight:700;text-decoration:underline;">${escapeHTML(supportEmail)}</a> with your order number.
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:30px 4px 8px 4px;text-align:center;font-size:12px;color:#888;">
          <p style="margin:0 0 6px 0;">Because not every love story deserves a sequel.</p>
          <p style="margin:0;">© 2026 Adamnoteve. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Plain text fallback for clients that don't render HTML.
  const text = [
    `ORDER PLACED — #${orderNumber}`,
    '',
    customerName ? `Thanks, ${customerName.split(' ')[0]}.` : 'Thanks for your order.',
    '',
    'ITEMS',
    '------',
    ...items.map((it) => {
      const v = it.variant ? ` (${it.variant})` : '';
      return `${it.name}${v} x${it.qty} — ${formatMoney(it.amount, currency)}`;
    }),
    '',
    `Subtotal:  ${formatMoney(subtotal, currency)}`,
    discount > 0 ? `Discount:  −${formatMoney(discount, currency)}` : '',
    `Shipping:  ${shipping === 0 ? 'FREE' : formatMoney(shipping, currency)}`,
    tax > 0 ? `Tax:       ${formatMoney(tax, currency)}` : '',
    `Total:     ${formatMoney(total, currency)}`,
    '',
    addrLines.length ? 'SHIPPING TO\n-----------\n' + addrLines.join('\n') : '',
    '',
    `Questions? Email ${supportEmail} with your order number.`,
    '',
    '— Adamnoteve',
  ].filter(Boolean).join('\n');

  return { html, text };
}

function shippingNotificationHTML({
  orderNumber,
  customerName,
  items, // [{ name, variant, qty }]
  trackingNumber,
  trackingUrl,
  carrier,
  shippingAddress,
  supportEmail,
  brandUrl,
}) {
  const itemRows = (items || []).map((it) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px dashed rgba(18,0,36,0.15);font-family:Helvetica,Arial,sans-serif;">
        <div style="font-weight:700;font-size:15px;color:${INK};">${escapeHTML(it.name)}</div>
        ${it.variant ? `<div style="font-size:13px;color:#666;margin-top:3px;">${escapeHTML(it.variant)}</div>` : ''}
      </td>
      <td style="padding:12px 0;border-bottom:1px dashed rgba(18,0,36,0.15);text-align:right;font-family:Helvetica,Arial,sans-serif;font-weight:700;font-size:14px;color:${INK};vertical-align:top;">
        ×${it.qty || 1}
      </td>
    </tr>
  `).join('');

  const addr = shippingAddress || {};
  const addrLines = [
    addr.name, addr.line1, addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);

  const trackBtn = trackingUrl ? `
    <tr><td style="padding:6px 4px 0 4px;" align="center">
      <a href="${escapeHTML(trackingUrl)}" style="display:inline-block;background:${INK};color:${NEON};font-family:Impact,Helvetica,Arial,sans-serif;letter-spacing:1px;font-size:18px;text-decoration:none;padding:16px 38px;border-radius:30px;">
        TRACK YOUR PACKAGE →
      </a>
    </td></tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your order shipped — #${escapeHTML(orderNumber)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM};padding:30px 10px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${CREAM};">

        <tr><td style="padding:0 0 28px 0;text-align:center;">
          <a href="${escapeHTML(brandUrl || '#')}" style="text-decoration:none;color:${INK};font-family:Impact,Helvetica,Arial,sans-serif;font-size:32px;letter-spacing:1px;">adamnot<span style="color:${PINK};">♥</span>eve</a>
        </td></tr>

        <!-- Hero -->
        <tr><td>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PINK};border:3px solid ${INK};border-radius:20px;overflow:hidden;">
            <tr><td style="padding:32px 28px;text-align:center;">
              <div style="display:inline-block;width:60px;height:60px;background:${NEON};border:3px solid ${INK};border-radius:50%;line-height:54px;font-size:30px;margin-bottom:14px;">📦</div>
              <h1 style="margin:0 0 8px 0;color:${CREAM};font-family:Impact,Helvetica,Arial,sans-serif;font-size:34px;letter-spacing:1px;">it's on the way!</h1>
              <p style="margin:0;color:${CREAM};font-size:16px;">${escapeHTML(customerName ? customerName.split(' ')[0] + ', your petty has shipped. 🍎' : 'your petty has shipped. 🍎')}</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 4px 8px 4px;" align="center">
          <div style="display:inline-block;background:${INK};color:${NEON};padding:8px 16px;border-radius:30px;font-family:Impact,Helvetica,Arial,sans-serif;letter-spacing:1px;font-size:13px;">ORDER #${escapeHTML(orderNumber)}</div>
        </td></tr>

        <!-- Tracking -->
        <tr><td style="padding:10px 4px 6px 4px;" align="center">
          <p style="margin:0 0 4px 0;font-size:14px;color:#666;">${escapeHTML(carrier || 'Carrier')} tracking number</p>
          <p style="margin:0 0 18px 0;font-family:monospace;font-size:18px;font-weight:700;color:${INK};">${escapeHTML(trackingNumber || '—')}</p>
        </td></tr>
        ${trackBtn}

        <!-- Items -->
        <tr><td style="padding:26px 4px 0 4px;">
          <h3 style="margin:0 0 6px 0;font-family:Impact,Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:1.5px;color:${PINK};">WHAT'S IN THE BOX</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${itemRows}</table>
        </td></tr>

        ${addrLines.length ? `
        <tr><td style="padding:24px 4px 0 4px;">
          <h3 style="margin:0 0 10px 0;font-family:Impact,Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:1.5px;color:${PINK};">SHIPPING TO</h3>
          <div style="font-size:14px;line-height:1.5;color:${INK};">${addrLines.map(escapeHTML).join('<br>')}</div>
        </td></tr>` : ''}

        <tr><td style="padding:32px 4px 0 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${NEON};border:3px solid ${INK};border-radius:16px;">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:${INK};">Tracking can take a day to start updating — totally normal. Questions about your order? Email <a href="mailto:${escapeHTML(supportEmail)}" style="color:${PINK};font-weight:700;text-decoration:underline;">${escapeHTML(supportEmail)}</a> and we'll sort it out.</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:30px 4px 8px 4px;text-align:center;font-size:12px;color:#888;">
          <p style="margin:0 0 6px 0;">Wear it like a souvenir from a trip you'd rather forget.</p>
          <p style="margin:0;">© 2026 Adamnoteve. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `IT'S ON THE WAY — Order #${orderNumber}`,
    '',
    customerName ? `${customerName.split(' ')[0]}, your order has shipped. 🍎` : 'Your order has shipped. 🍎',
    '',
    `${carrier || 'Carrier'} tracking: ${trackingNumber || '—'}`,
    trackingUrl ? `Track it: ${trackingUrl}` : '',
    '',
    'WHAT\'S IN THE BOX',
    '-----------------',
    ...(items || []).map((it) => `${it.name}${it.variant ? ` (${it.variant})` : ''} x${it.qty || 1}`),
    '',
    addrLines.length ? 'SHIPPING TO\n-----------\n' + addrLines.join('\n') : '',
    '',
    `Questions? Email ${supportEmail}.`,
    '',
    '— Adamnoteve',
  ].filter(Boolean).join('\n');

  return { html, text };
}

module.exports = { orderConfirmationHTML, shippingNotificationHTML };
