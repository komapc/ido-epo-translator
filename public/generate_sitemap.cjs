const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://tradukilo.lipu.dev';
const publicDir = __dirname;

console.log('--- Generating Sitemap for Translator ---');

// The home page and the static /about-{io,en,eo}, /ido-epo, /epo-ido pages are listed. The ?q=<word> result pages are noindex'd in
// _worker.js: they are thin single-word duplicates of the vortaro dictionary
// pages, Bing dropped them from its index (150 -> 2 pages), and ?q= accepts
// arbitrary text, so listing/indexing them invites index bloat and reflected
// content.
const today = new Date().toISOString().split('T')[0];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${today}</lastmod>
  </url>
${['about-io', 'about-en', 'about-eo', 'ido-epo', 'epo-ido'].map(l => `  <url>
    <loc>${DOMAIN}/${l}</loc>
    <lastmod>${today}</lastmod>
  </url>`).join('\n')}
</urlset>
`;

// Write to public/ (source) and dist/ (already copied by Vite before this
// postbuild step runs, so dist would otherwise ship the previous build's file).
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
console.log('✅ Sitemap generated (6 URLs).');
