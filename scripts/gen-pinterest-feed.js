#!/usr/bin/env node
// Generates a Pinterest/Google product data feed (RSS 2.0) from lib/products.js.
// Output: pinterest-feed.xml at the site root -> https://adamnoteve.com/pinterest-feed.xml
// Add that URL in Pinterest: Business Hub > Catalogs > add a data source.
const fs = require('fs');
const path = require('path');
const { PRODUCTS } = require('../lib/products.js');
// Keyword-optimized titles/descriptions for Pinterest search (feed only; the
// website keeps the witty names/descs). Falls back to name/desc when absent.
const { PIN_SEO } = require('../lib/pinterest-seo.js');

const SITE = 'https://adamnoteve.com';
const titleCase = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());

// Store category -> Google product taxonomy (used for google_product_category)
const GCAT = {
  apparel: 'Apparel & Accessories > Clothing',
  drinkware: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
  home: 'Home & Garden > Decor',
  accessories: 'Apparel & Accessories',
  novelty: 'Arts & Entertainment > Party & Celebration',
  stationery: 'Office Supplies',
};

const cdata = (s) => `<![CDATA[${String(s == null ? '' : s).replace(/]]>/g, ']]&gt;')}]]>`;
const xmlEsc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const absImg = (img) => (/^https?:\/\//i.test(img) ? img : `${SITE}/${String(img).replace(/^\//, '')}`);

const live = PRODUCTS.filter((p) => p.live && p.img && p.name && p.price != null);

const items = live.map((p) => {
  const link = `${SITE}/product.html?id=${p.id}`;
  const image = absImg(p.img);
  const price = `${Number(p.price).toFixed(2)} USD`;
  const gcat = GCAT[p.category] || 'Apparel & Accessories';
  const seo = PIN_SEO[p.id] || {};
  const kw = Array.isArray(seo.keywords) ? seo.keywords : [];
  // Keyword-optimized title/description for Pinterest search; fall back to the
  // witty product name/desc when this product has no SEO overlay entry yet.
  const title = seo.pinTitle || p.name;
  const baseDesc = seo.pinDesc || p.desc || p.name;
  // Append the target search phrases so the pin matches more queries.
  const desc = kw.length ? `${baseDesc}\n\nMore: ${kw.join(', ')}.` : baseDesc;
  // Keyword-rich product_type (Pinterest uses this for search/organization);
  // fall back to the store category when no keywords are defined.
  const ptype = kw.length
    ? kw.slice(0, 3).map(titleCase).join(' > ')
    : (p.category ? titleCase(p.category) : 'Merch');
  return [
    '    <item>',
    `      <g:id>${xmlEsc(p.id)}</g:id>`,
    `      <g:title>${cdata(title)}</g:title>`,
    `      <g:description>${cdata(desc)}</g:description>`,
    `      <g:link>${xmlEsc(link)}</g:link>`,
    `      <g:image_link>${xmlEsc(image)}</g:image_link>`,
    '      <g:availability>in stock</g:availability>',
    `      <g:price>${price}</g:price>`,
    '      <g:brand>adamnoteve</g:brand>',
    '      <g:condition>new</g:condition>',
    `      <g:google_product_category>${cdata(gcat)}</g:google_product_category>`,
    `      <g:product_type>${cdata(ptype)}</g:product_type>`,
    '    </item>',
  ].join('\n');
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>adamnoteve</title>
    <link>${SITE}</link>
    <description>Breakup &amp; villain-era merch — petty tees, mugs, stickers &amp; more.</description>
${items}
  </channel>
</rss>
`;

const out = path.join(__dirname, '..', 'pinterest-feed.xml');
fs.writeFileSync(out, xml);
console.log(`wrote ${out} with ${live.length} products (${xml.length} bytes)`);
