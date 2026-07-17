const fs=require('fs');
const p=require('../lib/products.js');
const cur=fs.readFileSync('sitemap.xml','utf8');
const DATE='2026-07-17';
// keep non-product <url> blocks (static pages) from current sitemap
const blocks=[...cur.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m=>m[0]).filter(b=>!b.includes('product.html'));
// refresh lastmod on static pages
const staticBlocks=blocks.map(b=>b.replace(/<lastmod>.*?<\/lastmod>/,`<lastmod>${DATE}</lastmod>`));
// live products
const live=p.PRODUCTS.filter(x=>x.live);
const prodBlocks=live.map(x=>`  <url>\n    <loc>https://adamnoteve.com/product.html?id=${x.id}</loc>\n    <lastmod>${DATE}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
const out=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticBlocks.join('\n')}\n${prodBlocks.join('\n')}\n</urlset>\n`;
fs.writeFileSync('sitemap.xml',out);
console.log('sitemap: '+staticBlocks.length+' static + '+prodBlocks.length+' live products = '+(staticBlocks.length+prodBlocks.length)+' urls');
