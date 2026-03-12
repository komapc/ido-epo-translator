const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://ido-tradukilo.pages.dev';
const publicDir = __dirname;
const DICTIONARY_PATH = path.join(__dirname, '../../vortaro/dictionary.json');

console.log('--- Generating Improved Sitemap for Translator ---');

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${new_date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

try {
  if (fs.existsSync(DICTIONARY_PATH)) {
    const dictionary = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
    const entries = dictionary.entries || [];
    
    // Add top 500 words as direct translation links
    // This encourages Google to index the dynamic translation pages
    const topEntries = entries.slice(0, 500);
    
    topEntries.forEach(entry => {
      const lemma = entry.lemma;
      const encoded = encodeURIComponent(lemma);
      
      // Ido -> Esperanto
      sitemap += `  <url>
    <loc>${DOMAIN}/?q=${encoded}&amp;dir=ido-epo</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    });
    
    console.log(`Added 500 common translation links to sitemap.`);
  } else {
    console.warn('Dictionary not found at ' + DICTIONARY_PATH + '. Skipping word links.');
  }
} catch (e) {
  console.error('Error processing dictionary for sitemap:', e);
}

sitemap += '</urlset>';

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
console.log('✅ Improved Sitemap generated.');

function new_date() { return new Date(); }
