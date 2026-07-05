#!/usr/bin/env node
// Generates a Pinterest/Google product data feed (RSS 2.0) from lib/products.js.
// Output: pinterest-feed.xml at the site root -> https://adamnoteve.com/pinterest-feed.xml
// Add that URL in Pinterest: Business Hub > Catalogs > add a data source.
const fs = require('fs');
const path = require('path');
const { PRODUCTS } = require('../lib/products.js');

const SITE = 'https://adamnoteve.com';

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
  const ptype = p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : 'Merch';
  const desc = (p.desc || p.name);
  return [
    '    <item>',
    `      <g:id>${xmlEsc(p.id)}</g:id>`,
    `      <g:title>${cdata(p.name)}</g:title>`,
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
